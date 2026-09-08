# Sweet Feet Backend

TypeScript + Express + MongoDB API for the Sweet Feet multi-vendor footwear marketplace.

Architecture adapted from the NASME-GYM (Audiophile) TypeScript backend reference, tailored to Sweet Feet’s domain:

- Customers & retailers (separate auth)
- Shoe products (sizes, gender, category, badges)
- Orders with per-item tracking statuses
- Customer ↔ retailer chat
- Feedback
- Paystack payments

## Setup

```bash
cd backend
cp .env.example .env
# edit .env with your MongoDB URI, JWT secret, Paystack keys

npm install
npm run dev
```

## API base

`http://localhost:5000/api/v1`

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Customer signup |
| POST | `/auth/login` | Customer login |
| POST | `/auth/retailer/register` | Retailer signup |
| POST | `/auth/retailer/login` | Retailer login |
| POST | `/auth/logout` | Logout |
| GET | `/auth/me` | Current user/retailer |

### Products
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/products` | Public | List active products |
| GET | `/products/:id` | Public | Single product |
| GET | `/products/mine` | Retailer | Own products |
| POST | `/products` | Retailer | Create |
| PATCH | `/products/:id` | Retailer | Update |
| DELETE | `/products/:id` | Retailer | Soft-delete |

### Orders
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/orders` | Customer | Create + Paystack init |
| POST | `/orders/verify` | — | Verify Paystack payment |
| GET | `/orders/mine` | Customer | My orders |
| GET | `/orders/retailer` | Retailer | Orders for my products |
| PATCH | `/orders/item-status` | Retailer | Update item status |

### Messages / Feedback / Retailers
See route files under `src/routes/`.

## Notes

- JWT is sent as `Authorization: Bearer <token>` or httpOnly cookie `jwt`.
- Retailer tokens include `type: "retailer"`; customer tokens use `type: "user"`.
- Existing PHP API under `/API` remains untouched so you can migrate frontend calls gradually.
