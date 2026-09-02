namespace T3VentureOS.Web.Dtos;

public record PagedResultDto<T>(List<T> Items, int TotalCount, int Page, int PageSize, int TotalPages);

public static class PagedResultDtoExtensions
{
    public static PagedResultDto<TDto> ToPagedDto<TSource, TDto>(
        this T3VentureOS.Infrastructure.Services.PagedResult<TSource> source, Func<TSource, TDto> map) =>
        new(source.Items.Select(map).ToList(), source.TotalCount, source.Page, source.PageSize, source.TotalPages);
}
