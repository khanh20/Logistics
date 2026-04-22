using System;

namespace LG.Core.ApplicationServices.Finance.OCR
{
    /// <summary>
    /// Kết quả trích xuất dữ liệu từ ảnh CCCD bằng Tesseract OCR
    /// </summary>
    public class CccdOcrResult
    {
        /// <summary>Số CCCD (12 chữ số)</summary>
        public string? IdNumber { get; set; }

        /// <summary>Họ và tên trên CCCD</summary>
        public string? FullName { get; set; }

        /// <summary>Ngày sinh (dd/MM/yyyy)</summary>
        public DateTime? DateOfBirth { get; set; }

        /// <summary>Giới tính (Nam/Nữ)</summary>
        public string? Gender { get; set; }

        /// <summary>Quê quán</summary>
        public string? PlaceOfOrigin { get; set; }

        /// <summary>Nơi thường trú</summary>
        public string? PlaceOfResidence { get; set; }

        /// <summary>Ngày hết hạn</summary>
        public DateTime? ExpiryDate { get; set; }

        /// <summary>Toàn bộ text OCR để debug / review</summary>
        public string? RawText { get; set; }

        /// <summary>OCR thành công hay không</summary>
        public bool Success { get; set; }

        /// <summary>Thông báo lỗi nếu có</summary>
        public string? ErrorMessage { get; set; }
    }
}
