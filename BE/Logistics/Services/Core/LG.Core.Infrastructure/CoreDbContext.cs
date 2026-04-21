using LG.Core.Domain.finance;
using LG.InfrastructureBase.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LG.Core.Infrastructure
{
    public class CoreDbContext : ApplicationDbContext
    {
        #region finance
        public DbSet<CustomerProfile> CustomerProfiles { get; set; }
        #endregion
        public CoreDbContext(
         DbContextOptions<CoreDbContext> options,
         IHttpContextAccessor httpContextAccessor
     )
         : base(options, httpContextAccessor) { }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {

            base.OnModelCreating(modelBuilder);
        }
    }
}
