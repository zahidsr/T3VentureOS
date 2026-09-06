using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace T3VentureOS.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSunumPaylasimi : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SunumPaylasimlari",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GirisimId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Jeton = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Etiket = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    GecerlilikBitisi = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IptalEdildi = table.Column<bool>(type: "bit", nullable: false),
                    GoruntulenmeSayisi = table.Column<int>(type: "int", nullable: false),
                    SonGoruntulenme = table.Column<DateTime>(type: "datetime2", nullable: true),
                    OlusturanId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SunumPaylasimlari", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SunumPaylasimlari_Girisimler_GirisimId",
                        column: x => x.GirisimId,
                        principalTable: "Girisimler",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SunumPaylasimlari_Users_OlusturanId",
                        column: x => x.OlusturanId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SunumPaylasimlari_GirisimId",
                table: "SunumPaylasimlari",
                column: "GirisimId");

            migrationBuilder.CreateIndex(
                name: "IX_SunumPaylasimlari_Jeton",
                table: "SunumPaylasimlari",
                column: "Jeton",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SunumPaylasimlari_OlusturanId",
                table: "SunumPaylasimlari",
                column: "OlusturanId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SunumPaylasimlari");
        }
    }
}
