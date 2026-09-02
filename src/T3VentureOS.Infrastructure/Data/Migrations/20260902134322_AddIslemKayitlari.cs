using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace T3VentureOS.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddIslemKayitlari : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "IslemKayitlari",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ActorId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ActorAdSoyad = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ActorEmail = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    HedefKullaniciId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    HedefAdSoyad = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    HedefEmail = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Eylem = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Detay = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IslemKayitlari", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_IslemKayitlari_CreatedAt",
                table: "IslemKayitlari",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_IslemKayitlari_HedefKullaniciId",
                table: "IslemKayitlari",
                column: "HedefKullaniciId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "IslemKayitlari");
        }
    }
}
