namespace LG.Module2.Domain.Exceptions;

public abstract class Module2DomainException(string message, string code) : Exception(message)
{
    public string Code { get; } = code;
}

public class PackageNotFoundException(object id)
    : Module2DomainException($"Không tìm thấy kiện hàng: {id}.", "PACKAGE_NOT_FOUND");

public class PackageAlreadyInSackException(object packageId)
    : Module2DomainException($"Kiện hàng {packageId} đã được đóng vào bao.", "PACKAGE_ALREADY_IN_SACK");

public class SackNotFoundException(object id)
    : Module2DomainException($"Không tìm thấy bao hàng: {id}.", "SACK_NOT_FOUND");

public class SackSealedException(object sackId)
    : Module2DomainException($"Bao {sackId} đã được kẹp chì, không thể thêm/xóa kiện.", "SACK_SEALED");

public class SackMixedFragileException()
    : Module2DomainException("Không được gộp kiện fragile với kiện thường trong cùng một bao.", "SACK_MIXED_FRAGILE");

public class ContainerTripNotFoundException(object id)
    : Module2DomainException($"Không tìm thấy chuyến container: {id}.", "CONTAINER_TRIP_NOT_FOUND");

public class WarehouseNotFoundException(object id)
    : Module2DomainException($"Không tìm thấy kho: {id}.", "WAREHOUSE_NOT_FOUND");

public class WarehouseCapacityExceededException(string warehouseName)
    : Module2DomainException($"Kho '{warehouseName}' đã đạt tối đa sức chứa.", "WAREHOUSE_CAPACITY_EXCEEDED");

public class InvalidPackageTransitionException(string from, string to)
    : Module2DomainException($"Không thể chuyển trạng thái kiện từ '{from}' sang '{to}'.", "INVALID_PACKAGE_TRANSITION");

public class DeliveryRequestNotFoundException(object id)
    : Module2DomainException($"Không tìm thấy yêu cầu giao hàng: {id}.", "DELIVERY_REQUEST_NOT_FOUND");

public class DomesticCarrierNotFoundException(object id)
    : Module2DomainException($"Không tìm thấy đơn vị vận chuyển nội địa: {id}.", "DOMESTIC_CARRIER_NOT_FOUND");

public class PackageWeightExceededException(string carrier, decimal maxKg, decimal actualKg)
    : Module2DomainException($"Carrier '{carrier}' chỉ nhận tối đa {maxKg}kg, kiện nặng {actualKg}kg.", "PACKAGE_WEIGHT_EXCEEDED");

public class MissingClaimNotFoundException(object id)
    : Module2DomainException($"Không tìm thấy khiếu nại: {id}.", "MISSING_CLAIM_NOT_FOUND");

public class InsuranceClaimNotFoundException(object id)
    : Module2DomainException($"Không tìm thấy yêu cầu bồi thường: {id}.", "INSURANCE_CLAIM_NOT_FOUND");

public class DuplicateBarcodeException(string barcode)
    : Module2DomainException($"Barcode '{barcode}' đã tồn tại trong hệ thống.", "DUPLICATE_BARCODE");

public class ChinaWaybillNotFoundException(object id)
    : Module2DomainException($"Không tìm thấy vận đơn TQ: {id}.", "CHINA_WAYBILL_NOT_FOUND");

public class WeightVarianceAlertException(decimal declared, decimal actual, decimal variancePct)
    : Module2DomainException(
        $"Cân nặng chênh lệch quá {variancePct:P0}: khai báo {declared}kg, thực tế {actual}kg.",
        "WEIGHT_VARIANCE_ALERT");

public class CustomsClearanceNotFoundException(object id)
    : Module2DomainException($"Không tìm thấy hồ sơ hải quan: {id}.", "CUSTOMS_CLEARANCE_NOT_FOUND");

public class DuplicateCustomsClearanceException(object tripId)
    : Module2DomainException($"Chuyến {tripId} đã có hồ sơ hải quan.", "DUPLICATE_CUSTOMS_CLEARANCE");

public class PackageNotWeighedException(string barcode)
    : Module2DomainException($"Kiện '{barcode}' chưa được cân nên không thể tính cước.", "PACKAGE_NOT_WEIGHED");

// ── Phase 6 — Delivery & Carrier ──────────────────────────────────────────────
public class EmptyDeliveryRequestException()
    : Module2DomainException("Yêu cầu giao hàng phải có ít nhất 1 kiện.", "EMPTY_DELIVERY_REQUEST");

public class PackageNotReadyForDeliveryException(string barcode, string status)
    : Module2DomainException($"Kiện '{barcode}' đang ở trạng thái '{status}', chưa sẵn sàng giao (cần ở kho VN).", "PACKAGE_NOT_READY_FOR_DELIVERY");

public class CarrierInactiveException(string name)
    : Module2DomainException($"Đơn vị vận chuyển '{name}' đang ngừng hoạt động.", "CARRIER_INACTIVE");

public class DomesticWaybillNotFoundException(object id)
    : Module2DomainException($"Không tìm thấy vận đơn nội địa: {id}.", "DOMESTIC_WAYBILL_NOT_FOUND");

public class InvalidWebhookSignatureException(string carrier)
    : Module2DomainException($"Chữ ký webhook từ '{carrier}' không hợp lệ.", "INVALID_WEBHOOK_SIGNATURE");

public class DeliveryNotCancellableException(string status)
    : Module2DomainException($"Không thể huỷ yêu cầu giao đang ở trạng thái '{status}'.", "DELIVERY_NOT_CANCELLABLE");

public class CarrierCancelFailedException(string trackingNo)
    : Module2DomainException($"Hãng vận chuyển từ chối huỷ vận đơn '{trackingNo}' (đơn có thể đã được lấy hàng).", "CARRIER_CANCEL_FAILED");

public class WalletOperationFailedException(string message)
    : Module2DomainException(message, "WALLET_OPERATION_FAILED");

public class DeliveryAddressNotFoundException(Guid id)
    : Module2DomainException($"Không tìm thấy địa chỉ giao '{id}' trong sổ địa chỉ của bạn.", "DELIVERY_ADDRESS_NOT_FOUND");

public class AddressLookupFailedException()
    : Module2DomainException("Không kiểm tra được sổ địa chỉ, vui lòng thử lại sau.", "ADDRESS_LOOKUP_FAILED");

// ── Phase 7 — Claims & Insurance ──────────────────────────────────────────────
public class InvalidClaimStateException(string currentStatus, string action)
    : Module2DomainException($"Không thể '{action}' khi khiếu nại đang ở trạng thái '{currentStatus}'.", "INVALID_CLAIM_STATE");

public class PackageNotInsuredException(string barcode)
    : Module2DomainException($"Kiện '{barcode}' không mua bảo hiểm nên không thể bồi thường.", "PACKAGE_NOT_INSURED");

// ── Phase 8 — AI Forecast ─────────────────────────────────────────────────────
public class BorderAlertNotFoundException(object id)
    : Module2DomainException($"Không tìm thấy cảnh báo tắc biên: {id}.", "BORDER_ALERT_NOT_FOUND");

public class BorderAlertAlreadyResolvedException(object id)
    : Module2DomainException($"Cảnh báo tắc biên {id} đã được gỡ trước đó.", "BORDER_ALERT_ALREADY_RESOLVED");
