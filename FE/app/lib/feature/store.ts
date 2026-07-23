import { configureStore } from "@reduxjs/toolkit";
import financeReducer from "./finance/financeSlice";
import authReducer from "./auth/authSlice";
import adminFinanceReducer from "./adminFinance/adminFinanceSlice";
import customerProfileReducer from "./customerProfile/customerProfileSlice";
import notificationReducer from "./notification/notificationSlice";

export const store = configureStore({
  reducer: {
    financeState: financeReducer,
    authState: authReducer,
    adminFinanceState: adminFinanceReducer,
    customerProfileState: customerProfileReducer,
    notificationState: notificationReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
