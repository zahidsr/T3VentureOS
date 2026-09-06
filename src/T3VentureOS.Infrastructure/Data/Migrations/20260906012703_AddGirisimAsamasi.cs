using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace T3VentureOS.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddGirisimAsamasi : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "BaslangictakiAsama",
                table: "ProgramKatilimlari",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BitistekiAsama",
                table: "ProgramKatilimlari",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Asama",
                table: "Girisimler",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "AsamaGecisleri",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GirisimId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OncekiAsama = table.Column<int>(type: "int", nullable: true),
                    YeniAsama = table.Column<int>(type: "int", nullable: false),
                    Tarih = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Aciklama = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    DegistirenId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AsamaGecisleri", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AsamaGecisleri_Girisimler_GirisimId",
                        column: x => x.GirisimId,
                        principalTable: "Girisimler",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AsamaGecisleri_Users_DegistirenId",
                        column: x => x.DegistirenId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AsamaGecisleri_DegistirenId",
                table: "AsamaGecisleri",
                column: "DegistirenId");

            migrationBuilder.CreateIndex(
                name: "IX_AsamaGecisleri_GirisimId_Tarih",
                table: "AsamaGecisleri",
                columns: new[] { "GirisimId", "Tarih" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AsamaGecisleri");

            migrationBuilder.DropColumn(
                name: "BaslangictakiAsama",
                table: "ProgramKatilimlari");

            migrationBuilder.DropColumn(
                name: "BitistekiAsama",
                table: "ProgramKatilimlari");

            migrationBuilder.DropColumn(
                name: "Asama",
                table: "Girisimler");
        }
    }
}
