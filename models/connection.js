import {
    Sequelize,
    DataTypes
} from "sequelize";

const conn = new Sequelize("toko_keyza", "root", "", {
    host: "localhost",
    dialect: 'mysql',
})

conn.authenticate().then(() => {
    console.log("koneksi berhasil bray");
}).catch(err => {
    console.log("koneksi gagal bray");
});

export {
    conn,
    DataTypes
}