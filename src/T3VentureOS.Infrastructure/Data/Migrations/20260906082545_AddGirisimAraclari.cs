using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace T3VentureOS.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddGirisimAraclari : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "HaftalikHedefler",
                columns: table => new
                {
                    GirisimId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    HaftaBaslangici = table.Column<DateOnly>(type: "date", nullable: false),
                    Hedef1 = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Hedef2 = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Hedef3 = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Tamamlandi1 = table.Column<bool>(type: "bit", nullable: false),
                    Tamamlandi2 = table.Column<bool>(type: "bit", nullable: false),
                    Tamamlandi3 = table.Column<bool>(type: "bit", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HaftalikHedefler", x => new { x.GirisimId, x.HaftaBaslangici });
                    table.ForeignKey(
                        name: "FK_HaftalikHedefler_Girisimler_GirisimId",
                        column: x => x.GirisimId,
                        principalTable: "Girisimler",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NakitPlanlari",
                columns: table => new
                {
                    GirisimId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    KasadakiPara = table.Column<decimal>(type: "decimal(14,2)", precision: 14, scale: 2, nullable: false),
                    AylikGelir = table.Column<decimal>(type: "decimal(14,2)", precision: 14, scale: 2, nullable: false),
                    AylikGider = table.Column<decimal>(type: "decimal(14,2)", precision: 14, scale: 2, nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NakitPlanlari", x => x.GirisimId);
                    table.ForeignKey(
                        name: "FK_NakitPlanlari_Girisimler_GirisimId",
                        column: x => x.GirisimId,
                        principalTable: "Girisimler",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "HaftalikHedefler");

            migrationBuilder.DropTable(
                name: "NakitPlanlari");
        }
    }
}
