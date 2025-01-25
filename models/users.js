import {
    conn,
    DataTypes
} from "./connection.js";


const User = conn.define('users', {
    username: DataTypes.STRING,
    password: DataTypes.STRING,
}, {
    timestamps: false,
    createdAt: false,
    updatedAt: false
});

export default User;

conn.sync().then(() => {
    console.log("tabel users sudah tersinkronisasi");
}).catch(err => {
    console.log("tabel users tidak tersinkronisasi");
});