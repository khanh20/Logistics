using LG.Core.ApplicationServices.Finance.DTOs.TransactionType;
using LG.Core.ApplicationServices.Finance.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace LG.Core.API.Controllers.Finance
{
    [Route("api/transaction-types")]
    public class TransactionTypeController : CoreBaseController
    {
        private readonly ITransactionTypeService _transactionTypeService;

        public TransactionTypeController(ITransactionTypeService transactionTypeService)
        {
            _transactionTypeService = transactionTypeService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _transactionTypeService.GetAllAsync();
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var result = await _transactionTypeService.GetByIdAsync(id);
            if (result == null)
                return NotFound(new { message = "Không tìm thấy loại giao dịch" });

            return Ok(result);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateTransactionTypeDto request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var result = await _transactionTypeService.CreateAsync(request);
            return Created(result, "Tạo loại giao dịch thành công.");
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTransactionTypeDto request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (id != request.Id)
                return BadRequest(new { message = "ID không khớp" });

            var success = await _transactionTypeService.UpdateAsync(request);
            if (!success)
                return NotFound(new { message = "Không tìm thấy loại giao dịch" });

            return Ok<object?>(null, "Cập nhật thành công.");
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var success = await _transactionTypeService.DeleteAsync(id);
            if (!success)
                return NotFound(new { message = "Không tìm thấy loại giao dịch" });

            return Ok<object?>(null, "Xóa thành công.");
        }
    }
}
