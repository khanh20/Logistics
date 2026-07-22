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
    route("finance/history", "routes/customer/finance-history.tsx"),
    route("profile", "routes/customer/profile.tsx"),
    route("vip-tier", "routes/customer/vip-tier.tsx"),
    route("bank-accounts", "routes/customer/bank-accounts.tsx"),
    route("addresses", "routes/customer/addresses.tsx"),
    // route("cart",           "routes/customer/cart.tsx"),
    route("cart", "routes/customer/cart.tsx"),
    route("orders", "routes/customer/orders._index.tsx"),
    route("orders/:id", "routes/customer/orders.$id.tsx"),

    route("packages", "routes/customer/packages._index.tsx"),
    route("packages/:id", "routes/customer/packages.$id.tsx"),
    route("delivery-requests", "routes/customer/delivery-requests._index.tsx"),
    route("delivery-requests/new", "routes/customer/delivery-requests.new.tsx"),
    route("delivery-requests/:id", "routes/customer/delivery-requests.$id.tsx"),
    route("forecast", "routes/customer/forecast.tsx"),
    route("claims", "routes/customer/claims._index.tsx"),
    route("claims/insurance/:id", "routes/customer/claims.insurance.$id.tsx"),
    route("claims/:id", "routes/customer/claims.$id.tsx"),
    route("products", "routes/customer/products._index.tsx"),
    route("products/:slug", "routes/customer/products.$slug.tsx"),
    route("favorites", "routes/customer/favorites.tsx"),
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
      route("finance/frozen-wallets", "routes/admin/finance.frozen-wallets.tsx"),
      route("finance/payment-locks", "routes/admin/finance.payment-locks.tsx"),
      route("finance/fee-rules", "routes/admin/finance.fee-rules.tsx"),
      route("finance/vip-tiers", "routes/admin/finance.vip-tiers.tsx"),
      route("finance/transaction-types", "routes/admin/finance.transaction-types.tsx"),
      route("finance/bank-accounts", "routes/admin/finance.bank-accounts.tsx"),
      route("finance/webhook-logs", "routes/admin/finance.webhook-logs.tsx"),
      route("finance/kyc", "routes/admin/finance.kyc.tsx"),
      route("finance/revenue", "routes/admin/finance.revenue.tsx"),

      // route("orders/:id",      "routes/admin/orders.$id.tsx"),
      // route("staff",           "routes/admin/staff._index.tsx"),
      route("staff-kpi", "routes/admin/staff-kpi.tsx"),
      route("staff-settings", "routes/admin/staff-settings.tsx"),
      // route("platform-orders", "routes/admin/platform-orders.tsx"),
      route("platform-orders", "routes/admin/platform-orders.tsx"),
      route("staff-dashboard", "routes/admin/staff-dashboard.tsx"),
      route("assignments/overdue", "routes/admin/assignments.overdue.tsx"),
      route("staff", "routes/admin/staff._index.tsx"),
      route("reviews", "routes/admin/reviews._index.tsx"),
      route("roles", "routes/admin/roles._index.tsx"),
      route("roles/:id", "routes/admin/roles.$id.tsx"),
      route("permissions", "routes/admin/permissions._index.tsx"),
      // ── Module 2: Logistics ──
      route("warehouses", "routes/admin/warehouses._index.tsx"),
      route("packages", "routes/admin/packages._index.tsx"),
      route("packages/:id", "routes/admin/packages.$id.tsx"),
      route("sacks", "routes/admin/sacks._index.tsx"),
      route("container-trips", "routes/admin/container-trips._index.tsx"),
      route("border-alerts", "routes/admin/border-alerts._index.tsx"),
      route("customs", "routes/admin/customs._index.tsx"),
      route("claims", "routes/admin/claims._index.tsx"),
    ]),
  ]),

  // Staff portal — cổng thao tác của chính nhân viên
  layout("layouts/staff-layout.tsx", [
    ...prefix("staff", [
      index("routes/staff/_index.tsx"),
      route("assignments", "routes/staff/assignments.tsx"),
      route("assignments/:id", "routes/staff/assignments.$id.tsx"),
      route("orders/:id", "routes/staff/orders.$id.tsx"),
      route("kpi", "routes/staff/kpi.tsx"),
      route("complaints", "routes/staff/complaints.tsx"),
      route("reviews", "routes/staff/reviews._index.tsx"),
      route("notifications", "routes/staff/notifications.tsx"),
    ]),
  ]),
] satisfies RouteConfig;
