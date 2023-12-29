// domain name = transactions.stackion.net
require("dotenv").config();
const http = require("http");
const {parse} = require("querystring");
const mysql = require("mysql");

let con = mysql.createConnection({
    host : process.env.MYSQL_HOST,
    user : process.env.MYSQL_USER,
    password : process.env.MYSQL_PASSWORD,
    database : process.env.MYSQL_DATABASE
});

function end_con() {
    con.end();
    con = mysql.createConnection({
        host : process.env.MYSQL_HOST,
        user : process.env.MYSQL_USER,
        password : process.env.MYSQL_PASSWORD,
        database : process.env.MYSQL_DATABASE
    });
}

const port = process.env.PORT  || 4003;

const server  = http.createServer((req , res) => {
    if(req.headers.origin === process.env.ALLOWED_ORIGIN) {
        res.writeHead(200,{
            "Access-Control-Allow-Origin"       : process.env.ALLOWED_ORIGIN,
            "Acess-Control-Allow-Methods"       : "OPTIONS, POST, GET",
            "Access-Control-Max-Age"            : 2592000,
            "Access-Control-Request-Headers"    : "Content-Type"
        })
        if(req.method === "POST" ) {
            let q, qData, req_url , body = "", message;
            req.on("data", data => {
                body += data;
            });
            req.on("end" , () => {
                qData = parse(body);
                message = JSON.parse(qData.content);
                if(message.req_name === "omc-value") {
                    fetch_omc_current_value(price => {
                        res.write(JSON.stringify({omcPrice : price , name : "omc-value"}));
                        res.end();
                    });
                }
                if(message.req_name === "omc-analysis-chart") {
                    generate_analysis_chart((x,y) => {
                        res.write(JSON.stringify({chart_axises : {xAxis : x , yAxis : y}, name : "omc-analysis-chart"}));
                        res.end();
                    });
                }
            });
        }
        else {
            res.write("Hello world!");
            res.end();
        }
    }
    else {
        res.writeHead(403,{
            "Access-Control-Allow-Origin"       : `https://stackion.net`
        });
        res.write("sorry");
        res.end();
    }
});
function fetch_omc_current_value(callback) {
    let sql = `SELECT omc_price_in_usd FROM omc`;
    con.query(sql , (err , result) => {
        if(err) throw err;
        end_con();
        if(result.length > 0) {
            callback(result[result.length - 1].omc_price_in_usd);
        }
        else {
            callback(26)
        }
    });
}
const date = new Date();
function generate_analysis_chart(callback) {
    let sql = `SELECT omc_price_in_usd FROM omc  ORDER BY id`;
    let xAxis = [] , yAxis = [];
    con.query(sql , (err , result) => {
        if(err) throw err;
        if(result.length > 7) {
            let reversed_result = result.reverse();
            for(let i = 1; i <= 7; i++) {
                xAxis.push(i);
                yAxis.push(reversed_result[i - 1].omc_price_in_usd);
            }
            yAxis = yAxis.reverse();
        }
        else {
            for(let i = 1; i <= result.length; i++) {
                xAxis.push(i);
                yAxis.push(result[i - 1].omc_price_in_usd);
            }
        }
        callback(xAxis , yAxis);
    });
}
//also send message each time there is a change in the price

server.listen(port, () => console.log(`server is running on port ${port}`));