using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace T3VentureOS.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddGirisimKapakGorseliVeCvPaylasimi : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "KapakGorseliUrl",
                table: "Girisimler",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "GirisimCvPaylasimlari",
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
                    table.PrimaryKey("PK_GirisimCvPaylasimlari", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GirisimCvPaylasimlari_Girisimler_GirisimId",
                        column: x => x.GirisimId,
                        principalTable: "Girisimler",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_GirisimCvPaylasimlari_Users_OlusturanId",
                        column: x => x.OlusturanId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_GirisimCvPaylasimlari_GirisimId",
                table: "GirisimCvPaylasimlari",
                column: "GirisimId");

            migrationBuilder.CreateIndex(
                name: "IX_GirisimCvPaylasimlari_Jeton",
                table: "GirisimCvPaylasimlari",
                column: "Jeton",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GirisimCvPaylasimlari_OlusturanId",
                table: "GirisimCvPaylasimlari",
                column: "OlusturanId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GirisimCvPaylasimlari");

            migrationBuilder.DropColumn(
                name: "KapakGorseliUrl",
                table: "Girisimler");
        }
    }
}
