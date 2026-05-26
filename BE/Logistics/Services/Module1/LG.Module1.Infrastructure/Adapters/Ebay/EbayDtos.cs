using System.Text.Json.Serialization;

namespace LG.Module1.Infrastructure.Adapters.Ebay;

internal class EbaySearchResponse
{
    [JsonPropertyName("total")] public int Total { get; set; }
    [JsonPropertyName("limit")] public int Limit { get; set; }
    [JsonPropertyName("offset")] public int Offset { get; set; }
    [JsonPropertyName("itemSummaries")] public List<EbayItemSummary> ItemSummaries { get; set; } = new();
}

internal class EbayItemSummary
{
    [JsonPropertyName("itemId")] public string ItemId { get; set; } = "";
    [JsonPropertyName("title")] public string Title { get; set; } = "";
    [JsonPropertyName("itemWebUrl")] public string ItemWebUrl { get; set; } = "";
    [JsonPropertyName("itemAffiliateWebUrl")] public string? AffiliateUrl { get; set; }

    [JsonPropertyName("image")] public EbayImage? Image { get; set; }
    [JsonPropertyName("additionalImages")] public List<EbayImage>? AdditionalImages { get; set; }

    [JsonPropertyName("price")] public EbayPrice? Price { get; set; }
    [JsonPropertyName("seller")] public EbaySeller? Seller { get; set; }
    [JsonPropertyName("condition")] public string? Condition { get; set; }
    [JsonPropertyName("categories")] public List<EbayCategory>? Categories { get; set; }

    [JsonPropertyName("itemLocation")] public EbayLocation? Location { get; set; }
    [JsonPropertyName("shippingOptions")] public List<EbayShipping>? ShippingOptions { get; set; }
}

internal class EbayItemDetailResponse : EbayItemSummary
{
    [JsonPropertyName("description")] public string? Description { get; set; }
    [JsonPropertyName("shortDescription")] public string? ShortDescription { get; set; }
    [JsonPropertyName("estimatedAvailabilities")]
    public List<EbayAvailability>? Availabilities { get; set; }
}

internal class EbayImage
{
    [JsonPropertyName("imageUrl")] public string ImageUrl { get; set; } = "";
}

internal class EbayPrice
{
    [JsonPropertyName("value")] public string Value { get; set; } = "0";
    [JsonPropertyName("currency")] public string Currency { get; set; } = "USD";

    public decimal AsDecimal() =>
        decimal.TryParse(Value, System.Globalization.NumberStyles.Any,
            System.Globalization.CultureInfo.InvariantCulture, out var v) ? v : 0m;
}

internal class EbaySeller
{
    [JsonPropertyName("username")] public string Username { get; set; } = "";
    [JsonPropertyName("feedbackPercentage")] public string? FeedbackPercentage { get; set; }
    [JsonPropertyName("feedbackScore")] public int? FeedbackScore { get; set; }
}

internal class EbayCategory
{
    [JsonPropertyName("categoryId")] public string CategoryId { get; set; } = "";
    [JsonPropertyName("categoryName")] public string CategoryName { get; set; } = "";
}

internal class EbayLocation
{
    [JsonPropertyName("country")] public string? Country { get; set; }
}

internal class EbayShipping
{
    [JsonPropertyName("shippingCost")] public EbayPrice? ShippingCost { get; set; }
    [JsonPropertyName("type")] public string? Type { get; set; }
}

internal class EbayAvailability
{
    [JsonPropertyName("estimatedAvailabilityStatus")]
    public string? Status { get; set; }
    [JsonPropertyName("estimatedAvailableQuantity")]
    public int? AvailableQuantity { get; set; }
}