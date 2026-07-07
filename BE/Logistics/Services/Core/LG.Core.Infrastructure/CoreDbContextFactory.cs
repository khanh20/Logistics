using Microsoft.EntityFrameworkCore.Design;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LG.Core.Infrastructure
{
    public class CoreDbContextFactory : IDesignTimeDbContextFactory<CoreDbContext>
    {
        public CoreDbContext CreateDbContext(string[] args)
        {
            var optionsBuilder = new DbContextOptionsBuilder<CoreDbContext>();

            optionsBuilder.UseNpgsql("Host=ep-bitter-surf-anvoq3e3-pooler.c-6.us-east-1.aws.neon.tech; Database=neondb; Username=neondb_owner; Password=npg_yZkI7NaMF9tX; SSL Mode=VerifyFull; Channel Binding=Require;");

            return new CoreDbContext(optionsBuilder.Options, null);
        }
    }
}
