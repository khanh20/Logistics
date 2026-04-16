import { useState } from "react";
import logo from "../assets/logo.png";
import { FaChevronDown } from "react-icons/fa";
import { Link } from "react-router";

export default function Header() {
  const [activeItem, setActiveItem] = useState("overview");
  return (
    <>
      <div className="bg-gray-100 p-1 flex justify-between items-center">
        <img src={logo} alt="" className="logo-img" />
        <div className="block-info">
          <div className="info-finance">
            <div className="text-xs">
              <span className="">Tỉ giá: </span>
              <span className="text-[#ff3333] font-bold">1Y = 4,000 VND</span>
            </div>
            <div className="text-xs">
              <span className="">Số dư: </span>
              <span className="text-[#ff3333] font-bold">0 VND</span>
            </div>
          </div>
          <div className="info-level">
            <span className="m-1.5">VIP 0</span>
          </div>
          <div className="info-user">
            <div className="bg-amber-500 px-3 py-1.5 rounded-3xl">D</div>
            <div className="user-name">
              <p className="text-sm text-[#ff3333] font-bold">DoDuyKhanh2003</p>
              <p className="text-xs text-blue-600 font-bold">Khách hàng</p>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-[#ff3333] ">
        <ul className="nav-menu">
          <li
            className={activeItem === "overview" ? "active" : ""}
            onClick={() => setActiveItem("overview")}
          >
            <Link to="#">Tổng quan</Link>
          </li>
          <li
            className={activeItem === "cart" ? "active" : ""}
            onClick={() => setActiveItem("cart")}
          >
            <Link to="#">Giỏ hàng</Link>
          </li>
          <li
            className={activeItem === "search" ? "active" : ""}
            onClick={() => setActiveItem("search")}
          >
            <Link to="#">Tìm kiếm sản phẩm</Link>
          </li>
          <li
            className={activeItem === "order" ? "active" : ""}
            onClick={() => setActiveItem("order")}
          >
            <Link to="#">Đơn mua hộ</Link>
            <FaChevronDown className="icon-down" />
          </li>
          <li
            className={activeItem === "consign" ? "active" : ""}
            onClick={() => setActiveItem("consign")}
          >
            <Link to="#">Ký gửi</Link>
            <FaChevronDown className="icon-down" />
          </li>
          <li
            className={activeItem === "payment" ? "active" : ""}
            onClick={() => setActiveItem("payment")}
          >
            <Link to="#">Thanh toán hộ</Link>
            <FaChevronDown className="icon-down" />
          </li>
          <li
            className={activeItem === "finance" ? "active" : ""}
            onClick={() => setActiveItem("finance")}
          >
            <Link to="#">Tài chính</Link>
            <FaChevronDown className="icon-down" />
            <div className="item-content">
              <ul>
                <li>
                  <Link to="/deposit">Tạo yêu cầu nạp </Link>
                </li>
                <li>
                  <Link to="/withdraw">Tạo yêu cầu rút </Link>
                </li>
                <li>
                  <Link to="">Lịch sử giao dịch </Link>
                </li>
              </ul>
            </div>
          </li>
          <li
            className={activeItem === "check" ? "active" : ""}
            onClick={() => setActiveItem("check")}
          >
            <Link to="#">Kiểm tra</Link>
            <FaChevronDown className="icon-down" />
            <div className="item-content">
              <ul>
                <li>
                  <Link to="">Tracking </Link>
                </li>
                <li>
                  <Link to="">Khiếu nại </Link>
                </li>
                <li>
                  <Link to="">Yêu cầu giao hàng</Link>
                </li>
              </ul>
            </div>
          </li>
          <li
            className={activeItem === "review" ? "active" : ""}
            onClick={() => setActiveItem("review")}
          >
            <Link to="#">Đánh giá</Link>
          </li>
        </ul>
      </div>
    </>
  );
}
