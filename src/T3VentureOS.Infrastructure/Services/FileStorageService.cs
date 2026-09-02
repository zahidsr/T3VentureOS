namespace T3VentureOS.Infrastructure.Services;

/// <summary>
/// Minimal local-disk file storage for startup documents. Root/public paths are supplied at
/// registration time from the Web project (which knows the actual content root), keeping this
/// class free of any ASP.NET Core hosting dependency.
/// </summary>
public class FileStorageService
{
    private readonly string _rootPath;
    private readonly string _publicBasePath;

    public FileStorageService(string rootPath, string publicBasePath)
    {
        _rootPath = rootPath;
        _publicBasePath = publicBasePath;
    }

    public async Task<(string Url, long Size)> SaveAsync(Stream content, string originalFileName)
    {
        Directory.CreateDirectory(_rootPath);
        var safeName = $"{Guid.NewGuid()}-{Path.GetFileName(originalFileName)}";
        var fullPath = Path.Combine(_rootPath, safeName);

        await using (var fs = File.Create(fullPath))
        {
            await content.CopyToAsync(fs);
        }

        var size = new FileInfo(fullPath).Length;
        return ($"{_publicBasePath}/{safeName}", size);
    }
}
