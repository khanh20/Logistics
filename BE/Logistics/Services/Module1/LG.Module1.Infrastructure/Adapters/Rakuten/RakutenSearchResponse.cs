using System.Text.Json.Serialization;

namespace LG.Module1.Infrastructure.Adapters.Rakuten;

// Internal DTOs — chỉ để parse JSON từ Rakuten, KHÔNG expose ra application layer.
// Application layer dùng RawProductResult ở Domain.

internal class RakutenSearchResponse
{
    [JsonPropertyName("count")] public int Count { get; set; }
    [JsonPropertyName("page")] public int Page { get; set; }
    [JsonPropertyName("pageCount")] public int PageCount { get; set; }
    [JsonPropertyName("hits")] public int Hits { get; set; }
    [JsonPropertyName("Items")] public List<RakutenItemWrapper> Items { get; set; } = new();
}

internal class RakutenItemWrapper
{
    [JsonPropertyName("Item")] public RakutenItem Item { get; set; } = new();
}

internal class RakutenItem
{
    [JsonPropertyName("itemName")] public string ItemName { get; set; } = "";
    [JsonPropertyName("catchcopy")] public string? CatchCopy { get; set; }
    [JsonPropertyName("itemCode")] public string ItemCode { get; set; } = "";
    [JsonPropertyName("itemPrice")] public decimal ItemPrice { get; set; }
    [JsonPropertyName("itemUrl")] public string ItemUrl { get; set; } = "";
    [JsonPropertyName("itemCaption")] public string? ItemCaption { get; set; }

    [JsonPropertyName("shopCode")] public string ShopCode { get; set; } = "";
    [JsonPropertyName("shopName")] public string ShopName { get; set; } = "";
    [JsonPropertyName("shopUrl")] public string? ShopUrl { get; set; }

    [JsonPropertyName("smallImageUrls")] public List<RakutenImageWrapper> SmallImages { get; set; } = new();
    [JsonPropertyName("mediumImageUrls")] public List<RakutenImageWrapper> MediumImages { get; set; } = new();

    [JsonPropertyName("reviewCount")] public int? ReviewCount { get; set; }
    [JsonPropertyName("reviewAverage")] public decimal? ReviewAverage { get; set; }

    [JsonPropertyName("genreId")] public string? GenreId { get; set; }

    [JsonPropertyName("shipOverseasFlag")] public int? ShipOverseasFlag { get; set; }   // 1 = có ship intl
    [JsonPropertyName("availability")] public int Availability { get; set; } = 1;
}

internal class RakutenImageWrapper
{
    [JsonPropertyName("imageUrl")] public string ImageUrl { get; set; } = "";
}