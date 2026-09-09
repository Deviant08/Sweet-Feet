import crypto from "crypto";
import axios from "axios";
import { Request, Response, NextFunction } from "express";
import Order from "../models/order.model";
import Product from "../models/product.model";
import { AppError } from "../middlewares/handleAppError.middleware";
import { OrderStatus, ItemStatus } from "../interface/order.interface";

export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  const { items, email } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return next(new AppError("Order items are required", 400));
  }

  const orderItems = [];
  let total = 0;

  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product || !product.isActive) {
      return next(new AppError(`Product ${item.productId} not found`, 404));
    }
    const qty = Number(item.quantity) || 1;
    const unitPrice = product.price;
    const subtotal = unitPrice * qty;
    total += subtotal;
    orderItems.push({
      retailer: product.retailer,
      product: product._id,
      productName: product.name,
      size: item.size,
      quantity: qty,
      unitPrice,
      subtotal,
      status: ItemStatus.placed,
    });
  }

  const order = await Order.create({
    user: req.user?.id,
    items: orderItems,
    total,
    status: OrderStatus.pending,
  });

  // Initiate Paystack payment
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (secret) {
    try {
      const paystackRes = await axios.post(
        "https://api.paystack.co/transaction/initialize",
        {
          email: email || req.user?.email,
          amount: Math.round(total * 100), // kobo
          metadata: { orderId: order._id.toString() },
          callback_url: req.body.callbackUrl,
        },
        { headers: { Authorization: `Bearer ${secret}` } }
      );
      const { authorization_url, reference } = paystackRes.data.data;
      order.paystackRef = reference;
      await order.save();
      return res.status(201).json({
        status: "Success",
        data: { order, authorization_url, reference },
      });
    } catch (err: any) {
      return next(new AppError(`Paystack error: ${err.response?.data?.message || err.message}`, 502));
    }
  }

  res.status(201).json({ status: "Success", data: { order } });
};

/**
 * Client-side verify (fallback / UX). Requires auth + ownership.
 * The authoritative path is the Paystack webhook.
 */
export const verifyPayment = async (req: Request, res: Response, next: NextFunction) => {
  const { reference } = req.body;
  if (!reference) return next(new AppError("Payment reference required", 400));

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return next(new AppError("Paystack not configured", 500));

  try {
    const paystackRes = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${secret}` } }
    );
    const data = paystackRes.data.data;
    if (data.status !== "success") {
      return next(new AppError("Payment not successful", 400));
    }

    const order = await Order.findOne({ paystackRef: reference });
    if (!order) return next(new AppError("Order not found for this reference", 404));

    // Ownership check
    if (String(order.user) !== String(req.user!.id)) {
      return next(new AppError("You do not own this order", 403));
    }

    if (order.status === OrderStatus.paid) {
      return res.status(200).json({ status: "Success", data: order, message: "Already paid" });
    }

    order.status = OrderStatus.paid;
    order.items.forEach((item: any) => {
      if (item.status === ItemStatus.placed) item.status = ItemStatus.confirmed;
    });
    await order.save();

    res.status(200).json({ status: "Success", data: order });
  } catch (err: any) {
    return next(new AppError(`Verify failed: ${err.response?.data?.message || err.message}`, 502));
  }
};

/**
 * Paystack webhook — source of truth for payment confirmation.
 * Signature is verified with the raw body (see app.ts).
 */
export const paystackWebhook = async (req: Request, res: Response) => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return res.status(500).send("Paystack not configured");
  }

  const signature = req.headers["x-paystack-signature"] as string | undefined;
  const raw = (req as any).rawBody as Buffer | undefined;

  if (!signature || !raw) {
    return res.status(401).send("Missing signature or body");
  }

  const hash = crypto.createHmac("sha512", secret).update(raw).digest("hex");
  if (hash !== signature) {
    return res.status(401).send("Invalid signature");
  }

  const event = req.body;
  if (event?.event === "charge.success") {
    const reference = event.data?.reference;
    if (reference) {
      const order = await Order.findOne({ paystackRef: reference });
      if (order && order.status !== OrderStatus.paid) {
        order.status = OrderStatus.paid;
        order.items.forEach((item: any) => {
          if (item.status === ItemStatus.placed) item.status = ItemStatus.confirmed;
        });
        await order.save();
        // TODO: notify retailers (email / push)
      }
    }
  }

  // Always 200 so Paystack does not retry
  res.status(200).send("OK");
};

export const getMyOrders = async (req: Request, res: Response) => {
  const orders = await Order.find({ user: req.user!.id }).sort({ orderedAt: -1 });
  res.status(200).json({ status: "Success", results: orders.length, data: orders });
};

export const getRetailerOrders = async (req: Request, res: Response) => {
  const orders = await Order.find({ "items.retailer": req.retailer!.id }).sort({ orderedAt: -1 });
  res.status(200).json({ status: "Success", results: orders.length, data: orders });
};

export const updateItemStatus = async (req: Request, res: Response, next: NextFunction) => {
  const { orderId, itemId, status, note } = req.body;
  if (!orderId || !itemId || !status) {
    return next(new AppError("orderId, itemId and status are required", 400));
  }
  if (!Object.values(ItemStatus).includes(status)) {
    return next(new AppError("Invalid status", 400));
  }

  const order = await Order.findById(orderId);
  if (!order) return next(new AppError("Order not found", 404));

  const item = (order.items as any).id(itemId);
  if (!item) return next(new AppError("Order item not found", 404));
  if (String(item.retailer) !== String(req.retailer!.id)) {
    return next(new AppError("You do not own this order item", 403));
  }

  item.status = status;
  await order.save();

  res.status(200).json({ status: "Success", data: order, note });
};

export const getOrder = async (req: Request, res: Response, next: NextFunction) => {
  const order = await Order.findById(req.params.id);
  if (!order) return next(new AppError("Order not found", 404));

  // Customer can only see own orders; retailers can see orders that contain their items
  const isOwner = req.user && String(order.user) === String(req.user.id);
  const isRetailerOnOrder =
    req.retailer &&
    order.items.some((item: any) => String(item.retailer) === String(req.retailer!.id));

  if (!isOwner && !isRetailerOnOrder) {
    return next(new AppError("You do not have access to this order", 403));
  }

  res.status(200).json({ status: "Success", data: order });
};
