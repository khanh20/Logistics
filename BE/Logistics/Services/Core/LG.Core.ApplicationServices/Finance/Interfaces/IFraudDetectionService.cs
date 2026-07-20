using LG.Core.ApplicationServices.Finance.DTOs.FraudDetection;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace LG.Core.ApplicationServices.Finance.Interfaces
{
    public interface IFraudDetectionService
    {
        Task<List<FraudDetectionDto>> GetAllAsync();
        Task<FraudDetectionDto?> GetByIdAsync(Guid id);
        Task<bool> ReviewAsync(Guid id, ReviewFraudDto dto, Guid adminId);
        Task<EvaluateFraudResultDto> EvaluateTransactionAsync(Guid customerId, decimal amount, string transactionType, string contextInfo);
        Task CreateFraudRecordAsync(Guid customerId, decimal riskScore, string reason);
    }
}
