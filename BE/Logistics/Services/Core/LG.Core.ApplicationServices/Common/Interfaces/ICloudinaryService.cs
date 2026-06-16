using Microsoft.AspNetCore.Http;
using System.Threading.Tasks;

namespace LG.Core.ApplicationServices.Common.Interfaces
{
    public interface ICloudinaryService
    {
        /// <summary>
        /// Upload ảnh lên Cloudinary và trả về URL tuyệt đối
        /// </summary>
        /// <param name="file">File ảnh từ request</param>
        /// <param name="folder">Thư mục trên Cloudinary (VD: kyc/front)</param>
        /// <returns>URL ảnh (https://res.cloudinary.com/...)</returns>
        Task<string> UploadImageAsync(IFormFile file, string folder);
    }
}
