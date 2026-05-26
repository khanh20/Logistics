using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace LG.Module2.Infrastructure.Data;

public class Module2DbContextFactory : IDesignTimeDbContextFactory<Module2DbContext>
{
    public Module2DbContext CreateDbContext(string[] args)
    {
        var opts = new DbContextOptionsBuilder<Module2DbContext>()
            .UseNpgsql("Host=localhost;Database=logistics_mod2;Username=postgres;Password=postgres")
            .Options;
        return new Module2DbContext(opts);
    }
}
