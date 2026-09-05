using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace T3VentureOS.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddIstihdamKaydi : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "IstihdamKayitlari",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GirisimId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Donem = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CalisanSayisi = table.Column<int>(type: "int", nullable: false),
                    YeniIseAlim = table.Column<int>(type: "int", nullable: true),
                    OnayDurumu = table.Column<int>(type: "int", nullable: false),
                    SubmittedById = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReviewedById = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ReviewNotu = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IstihdamKayitlari", x => x.Id);
                    table.ForeignKey(
                        name: "FK_IstihdamKayitlari_Girisimler_GirisimId",
                        column: x => x.GirisimId,
                        principalTable: "Girisimler",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_IstihdamKayitlari_Users_ReviewedById",
                        column: x => x.ReviewedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_IstihdamKayitlari_Users_SubmittedById",
                        column: x => x.SubmittedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_IstihdamKayitlari_GirisimId_Donem",
                table: "IstihdamKayitlari",
                columns: new[] { "GirisimId", "Donem" });

            migrationBuilder.CreateIndex(
                name: "IX_IstihdamKayitlari_ReviewedById",
                table: "IstihdamKayitlari",
                column: "ReviewedById");

            migrationBuilder.CreateIndex(
                name: "IX_IstihdamKayitlari_SubmittedById",
                table: "IstihdamKayitlari",
                column: "SubmittedById");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "IstihdamKayitlari");
        }
    }
}
