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
