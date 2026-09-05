using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace T3VentureOS.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddOnayOnerisi : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "OnayOnerileri",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    KonuTuru = table.Column<int>(type: "int", nullable: false),
                    KonuId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Tavsiye = table.Column<int>(type: "int", nullable: false),
                    Not = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    OneriVerenId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OnayOnerileri", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OnayOnerileri_Users_OneriVerenId",
                        column: x => x.OneriVerenId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_OnayOnerileri_KonuTuru_KonuId_OneriVerenId",
                table: "OnayOnerileri",
                columns: new[] { "KonuTuru", "KonuId", "OneriVerenId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OnayOnerileri_OneriVerenId",
                table: "OnayOnerileri",
                column: "OneriVerenId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OnayOnerileri");
        }
    }
}
