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

            optionsBuilder.UseNpgsql("Host=ep-icy-surf-andzhy8z-pooler.c-6.us-east-1.aws.neon.tech;Port=5432;Database=neondb;Username=neondb_owner;Password=npg_mpwxt0KdJz2D;SSL Mode=Require;Trust Server Certificate=true");

            return new CoreDbContext(optionsBuilder.Options, null);
        }
    }
}
