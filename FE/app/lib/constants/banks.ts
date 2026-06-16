export interface Bank {
  code: string;
  name: string;
  shortName: string;
}

export const VIETNAM_BANKS: Bank[] = [
  { code: "ICB", name: "Ngân hàng TMCP Công thương Việt Nam", shortName: "VietinBank" },
  { code: "VCB", name: "Ngân hàng TMCP Ngoại Thương Việt Nam", shortName: "Vietcombank" },
  { code: "BIDV", name: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam", shortName: "BIDV" },
  { code: "VBA", name: "Ngân hàng NN & PTNT Việt Nam", shortName: "Agribank" },
  { code: "TCB", name: "Ngân hàng TMCP Kỹ thương Việt Nam", shortName: "Techcombank" },
  { code: "MB", name: "Ngân hàng TMCP Quân đội", shortName: "MBBank" },
  { code: "VPB", name: "Ngân hàng TMCP Việt Nam Thịnh Vượng", shortName: "VPBank" },
  { code: "ACB", name: "Ngân hàng TMCP Á Châu", shortName: "ACB" },
  { code: "SHB", name: "Ngân hàng TMCP Sài Gòn - Hà Nội", shortName: "SHB" },
  { code: "HDB", name: "Ngân hàng TMCP Phát triển Thành phố Hồ Chí Minh", shortName: "HDBank" },
  { code: "SCB", name: "Ngân hàng TMCP Sài Gòn", shortName: "SCB" },
  { code: "STB", name: "Ngân hàng TMCP Sài Gòn Thương Tín", shortName: "Sacombank" },
  { code: "VIB", name: "Ngân hàng TMCP Quốc tế Việt Nam", shortName: "VIB" },
  { code: "MSB", name: "Ngân hàng TMCP Hàng Hải Việt Nam", shortName: "MSB" },
  { code: "SSB", name: "Ngân hàng TMCP Đông Nam Á", shortName: "SeABank" },
  { code: "OCB", name: "Ngân hàng TMCP Phương Đông", shortName: "OCB" },
  { code: "EXB", name: "Ngân hàng TMCP Xuất Nhập khẩu Việt Nam", shortName: "Eximbank" },
  { code: "LPB", name: "Ngân hàng TMCP Bưu Điện Liên Việt", shortName: "LienVietPostBank" },
  { code: "TPB", name: "Ngân hàng TMCP Tiên Phong", shortName: "TPBank" },
  { code: "NAB", name: "Ngân hàng TMCP Nam Á", shortName: "NamABank" },
  { code: "KLB", name: "Ngân hàng TMCP Kiên Long", shortName: "KienLongBank" },
  { code: "VAB", name: "Ngân hàng TMCP Việt Á", shortName: "VietABank" },
  { code: "NCB", name: "Ngân hàng TMCP Quốc Dân", shortName: "NCB" },
  { code: "BVB", name: "Ngân hàng TMCP Bản Việt", shortName: "BanVietBank" },
  { code: "PGB", name: "Ngân hàng TMCP Xăng dầu Petrolimex", shortName: "PGBank" },
  { code: "SGB", name: "Ngân hàng TMCP Sài Gòn Công Thương", shortName: "Saigonbank" },
  { code: "BAB", name: "Ngân hàng TMCP Bắc Á", shortName: "BacABank" },
];
