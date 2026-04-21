export interface IViewGuestGroup {
  id: number;
  code: string;
  name: string;
  content: string;
  idPhongBan: number;
  phongBan: string;
  staffReceptionName: string;
  location?: string | null;
  idStaffReception: number;
  totalPerson: number;
  phoneNumber?: string | null;
  status: number;
  requestDate: string;
  receptionDate: string;
  totalMoney: number;
}
