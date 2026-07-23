import { useEffect, useRef } from "react";
import * as signalR from "@microsoft/signalr";
import { useAppDispatch, useAppSelector } from "./hooks";
import {
  receiveNotification,
  receiveStaffNotification,
} from "./notification/notificationSlice";
import { toast } from "react-toastify";

const AUTH_BASE_URL = import.meta.env.VITE_AUTH_API_URL ?? "https://localhost:7237";
const MODULE1_BASE_URL = import.meta.env.VITE_MODULE1_API_URL ?? "https://localhost:7167";

export function useSignalR() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.authState.token);
  const roles = useAppSelector((state) => state.authState.roles);

  const customerHubRef = useRef<signalR.HubConnection | null>(null);
  const staffHubRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    if (!token) return;

    const isStaffOrAdmin = roles.includes("Admin") || roles.includes("Staff");
    const isCustomer = roles.includes("Customer");

    // 1. Customer Hub 
    const customerHub = new signalR.HubConnectionBuilder()
      .withUrl(`${AUTH_BASE_URL}/hubs/notifications`, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build();

    customerHub.on("ReceiveNotification", (notification) => {
      dispatch(receiveNotification(notification));
      toast.info(`Thông báo mới: ${notification.title}`, { position: "top-right" });
    });

    customerHub
      .start()
      .catch((err) => console.error("Customer SignalR Error:", err));

    customerHubRef.current = customerHub;

    // 2. Staff Hub
    if (isStaffOrAdmin) {
      const staffHub = new signalR.HubConnectionBuilder()
        .withUrl(`${MODULE1_BASE_URL}/hubs/staff-notifications`, {
          accessTokenFactory: () => token,
        })
        .withAutomaticReconnect()
        .build();

      staffHub.on("ReceiveStaffNotification", (notification) => {
        dispatch(receiveStaffNotification(notification));
        toast.info(`Staff alert: ${notification.title}`, { position: "top-right" });
      });

      staffHub
        .start()
        .catch((err) => console.error("Staff SignalR Error:", err));

      staffHubRef.current = staffHub;
    }

    return () => {
      if (customerHubRef.current) {
        customerHubRef.current.stop();
        customerHubRef.current = null;
      }
      if (staffHubRef.current) {
        staffHubRef.current.stop();
        staffHubRef.current = null;
      }
    };
  }, [token, roles, dispatch]);
}
