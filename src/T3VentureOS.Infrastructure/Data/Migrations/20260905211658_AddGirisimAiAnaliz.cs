using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace T3VentureOS.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddGirisimAiAnaliz : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "GirisimId",
                table: "AiAnalizKayitlari",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Tur",
                table: "AiAnalizKayitlari",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_AiAnalizKayitlari_GirisimId_Tur",
                table: "AiAnalizKayitlari",
                columns: new[] { "GirisimId", "Tur" });

            migrationBuilder.AddForeignKey(
                name: "FK_AiAnalizKayitlari_Girisimler_GirisimId",
                table: "AiAnalizKayitlari",
                column: "GirisimId",
                principalTable: "Girisimler",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AiAnalizKayitlari_Girisimler_GirisimId",
                table: "AiAnalizKayitlari");

            migrationBuilder.DropIndex(
                name: "IX_AiAnalizKayitlari_GirisimId_Tur",
                table: "AiAnalizKayitlari");

            migrationBuilder.DropColumn(
                name: "GirisimId",
                table: "AiAnalizKayitlari");

            migrationBuilder.DropColumn(
                name: "Tur",
                table: "AiAnalizKayitlari");
        }
    }
}
