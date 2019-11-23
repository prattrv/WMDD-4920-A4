const {cp} = require('./connection.js');
const {query} = require('./promise-mysql.js');
const mysql = require('mysql');
const csvParser = require('csv-parser');
const stripBom = require('strip-bom-stream'); 
const fs = require('fs');

// query(cp, 'USE pratt_4920a3; DROP PROCEDURE IF EXISTS insert_song;') 
// .then(result=>query(cp, `CREATE PROCEDURE insert_song ( IN p_song_name VARCHAR(255), IN p_minutes INT,
// IN p_seconds INT,
// IN p_album_name VARCHAR(255)
// ) BEGIN
// INSERT INTO song (name, minutes, seconds, album_id) VALUES (p_song_name, p_minutes, p_seconds, (SELECT album_id FROM album WHERE name=p_album_name));
// END;`)) // Create stored procedure here
// .then(results=>{console.log('setup successful'); process.exit()})
// .catch(error=>{console.log(error); process.exit();});

let setupBands = (bandFile) => {
    return new Promise((resolve,reject)=>{
        let bandSQL = 'SET FOREIGN_KEY_CHECKS = 0; DROP TABLE IF EXISTS band; SET FOREIGN_KEY_CHECKS = 1; CREATE TABLE band (id int AUTO_INCREMENT, name varchar(255), PRIMARY KEY(id));'; // TODO
        fs.createReadStream(bandFile)
        .pipe(stripBom()) // strip out byte order mark before sending to csv parser 
        .pipe(csvParser( {
            mapHeaders: ({ header, index }) => header.toLowerCase()
        })) 
        .on('data', row=> {
            let bandName = mysql.escape(row.name)
                
                let bandInsertSQL = `INSERT INTO band(name)
                VALUES (
                    ${bandName}
                );`
                
                bandSQL = bandSQL.concat(bandInsertSQL)
        })
        .on('end', () => {
            // once we reach the end of the file, run the query on the database
            query(cp, bandSQL) 
            .then(result=>resolve(result)) 
            .catch(error=>reject(error));
        });
    });// end of promise
} // end of setupBands function





let setupAlbums = (albumFile) => {
    return new Promise((resolve,reject)=>{
        let albumSQL = 'DROP TABLE IF EXISTS album; CREATE TABLE album (id int AUTO_INCREMENT, name varchar(255), band_id int, PRIMARY KEY(id), FOREIGN KEY(band_id) REFERENCES band(id) ON DELETE SET NULL ON UPDATE CASCADE);'; // TODO
        fs.createReadStream(albumFile)
        .pipe(stripBom()) // strip out byte order mark before sending to csv parser 
        .pipe(csvParser( {
            mapHeaders: ({ header, index }) => header.toLowerCase()
        })) 
        .on('data', row=> {
            let albumName = mysql.escape(row.name)
            let bandName = mysql.escape(row.band_name)
                
                let albumInsertSQL = `INSERT INTO album(name, band_id)
                VALUES (
                    ${albumName},
                    (SELECT id FROM band WHERE name=${bandName})
                );`
                
                albumSQL = albumSQL.concat(albumInsertSQL)
        })
        .on('end', () => {
            // once we reach the end of the file, run the query on the database
            query(cp, albumSQL) 
            .then(result=>resolve(result)) 
            .catch(error=>reject(error));
        });
    });// end of promise
} // end of setupBands function


setupBands('./bands.csv') 
.then(result=>{console.log("bands success");})
.then(result=>setupAlbums('./albums.csv'))
.then(result=>{console.log("albums success"); process.exit();})
.catch(error=>console.log(error));