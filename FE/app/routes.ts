import { type RouteConfig, index, layout, prefix, route } from "@react-router/dev/routes";

export default [
  // Auth — full-screen, không nav
  layout("layouts/auth-layout.tsx", [
    route("login", "routes/auth/login.tsx"),
    route("register", "routes/auth/register.tsx"),
  ]),

  // Customer app
  layout("layouts/customer-layout.tsx", [
    index("routes/customer/_index.tsx"),
    route("finance", "routes/customer/finance.tsx"),
    route("profile", "routes/customer/profile.tsx"),
    route("bank-accounts", "routes/customer/bank-accounts.tsx"),
    route("addresses", "routes/customer/addresses.tsx"),
    // route("cart",           "routes/customer/cart.tsx"),
    route("cart", "routes/customer/cart.tsx"),
    route("orders", "routes/customer/orders._index.tsx"),
    route("orders/:id", "routes/customer/orders.$id.tsx"),
    route("products/:slug", "routes/customer/products.$slug.tsx"),
    // route("profile",        "routes/customer/profile.tsx"),
  ]),

  // Admin / Staff app
  layout("layouts/admin-layout.tsx", [
    ...prefix("admin", [
      index("routes/admin/_index.tsx"),
      route("orders", "routes/admin/orders._index.tsx"),
      route("orders/:id", "routes/admin/orders.$id.tsx"),
      route("products", "routes/admin/products._index.tsx"),
      route("products/:id", "routes/admin/products.$id.tsx"),
      route("categories", "routes/admin/categories._index.tsx"),
      route("platforms", "routes/admin/platforms._index.tsx"),
      route("ingestion", "routes/admin/ingestion.tsx"),
      route("exchange-rates", "routes/admin/exchange-rates.tsx"),

      // Finance Admin Routes
      route("finance", "routes/admin/finance._index.tsx"),
      route("finance/withdraws", "routes/admin/finance.withdraws.tsx"),
      route("finance/transactions", "routes/admin/finance.transactions.tsx"),
      route("finance/refunds", "routes/admin/finance.refunds.tsx"),
      route("finance/reconcile", "routes/admin/finance.reconcile.tsx"),
      route("finance/fraud", "routes/admin/finance.fraud.tsx"),
      route("finance/payment-locks", "routes/admin/finance.payment-locks.tsx"),
      route("finance/fee-rules", "routes/admin/finance.fee-rules.tsx"),
      route("finance/vip-tiers", "routes/admin/finance.vip-tiers.tsx"),
      route("finance/transaction-types", "routes/admin/finance.transaction-types.tsx"),
      route("finance/bank-accounts", "routes/admin/finance.bank-accounts.tsx"),
      route("finance/webhook-logs", "routes/admin/finance.webhook-logs.tsx"),
      route("finance/kyc", "routes/admin/finance.kyc.tsx"),

      // route("orders/:id",      "routes/admin/orders.$id.tsx"),
      // route("staff",           "routes/admin/staff._index.tsx"),
      // route("platform-orders", "routes/admin/platform-orders.tsx"),
      route("platform-orders", "routes/admin/platform-orders.tsx"),
      route("staff-dashboard", "routes/admin/staff-dashboard.tsx"),
      route("assignments/overdue", "routes/admin/assignments.overdue.tsx"),
      route("staff", "routes/admin/staff._index.tsx"),
      route("roles", "routes/admin/roles._index.tsx"),
      route("roles/:id", "routes/admin/roles.$id.tsx"),
      route("permissions", "routes/admin/permissions._index.tsx"),
    ]),
  ]),
] satisfies RouteConfig;
