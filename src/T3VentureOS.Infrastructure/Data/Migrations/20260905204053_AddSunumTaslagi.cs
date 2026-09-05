using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace T3VentureOS.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSunumTaslagi : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SunumTaslaklari",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GirisimId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IcerikJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    VeriParmakIzi = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    OlusturanId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SunumTaslaklari", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SunumTaslaklari_Girisimler_GirisimId",
                        column: x => x.GirisimId,
                        principalTable: "Girisimler",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SunumTaslaklari_Users_OlusturanId",
                        column: x => x.OlusturanId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SunumTaslaklari_GirisimId",
                table: "SunumTaslaklari",
                column: "GirisimId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SunumTaslaklari_OlusturanId",
                table: "SunumTaslaklari",
                column: "OlusturanId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SunumTaslaklari");
        }
    }
}
