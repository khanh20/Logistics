import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  layout("routes/app-layout.tsx", [
    index("routes/home.tsx"),
    route("deposit", "pages/finance/acc_manager/deposit.tsx"),
    route("withdraw", "pages/finance/acc_manager/withdraw.tsx"),
  ]),
] satisfies RouteConfig;
