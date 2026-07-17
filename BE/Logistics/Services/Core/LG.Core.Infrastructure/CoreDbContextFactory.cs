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

            var connectionString = Environment.GetEnvironmentVariable("DATABASE_URL") 
                ?? "Host=localhost;Database=dummy_core;Username=postgres;Password=postgres";

            optionsBuilder.UseNpgsql(connectionString);

            return new CoreDbContext(optionsBuilder.Options, null);
        }
    }
}
