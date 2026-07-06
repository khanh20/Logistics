namespace LG.Core.ApplicationServices.Finance.DTOs.FraudDetection
{
    public class EvaluateFraudResultDto
    {
        public bool IsFraud { get; set; }
        public decimal RiskScore { get; set; }
        public string Reason { get; set; } = string.Empty;
    }
}
