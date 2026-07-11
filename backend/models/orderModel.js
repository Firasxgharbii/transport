const db = require("../config/db");

const OrderModel = {

    async getAllOrders() {

        const [rows] = await db.query(`
            SELECT
                o.*,

                c.first_name AS client_first_name,
                c.last_name AS client_last_name,
                c.company_name,

                d.id AS driver_record_id,

                u.first_name AS driver_first_name,
                u.last_name AS driver_last_name

            FROM orders o

            JOIN clients c
                ON o.client_id = c.id

            LEFT JOIN drivers d
                ON o.driver_id = d.id

            LEFT JOIN users u
                ON d.user_id = u.id

            ORDER BY o.created_at DESC
        `);

        return rows;
    },



    async getOrderById(id){

        const [rows] = await db.query(`

            SELECT

                o.*,

                c.first_name AS client_first_name,
                c.last_name AS client_last_name,
                c.company_name,

                d.id AS driver_record_id,

                u.first_name AS driver_first_name,
                u.last_name AS driver_last_name

            FROM orders o

            JOIN clients c
                ON o.client_id=c.id

            LEFT JOIN drivers d
                ON o.driver_id=d.id

            LEFT JOIN users u
                ON d.user_id=u.id

            WHERE o.id=?

        `,[id]);

        return rows[0];

    },



    async createOrder(data){

        const{

            order_number,
            client_id,
            driver_id,

            pickup_address,
            delivery_address,

            pickup_date,
            pickup_time,

            delivery_date,
            delivery_time,

            pallets_count,

            description,
            notes,

            status

        }=data;


        const[result]=await db.query(`

            INSERT INTO orders(

                order_number,

                client_id,

                driver_id,

                pickup_address,

                delivery_address,

                pickup_date,

                pickup_time,

                delivery_date,

                delivery_time,

                pallets_count,

                description,

                notes,

                status

            )

            VALUES(

                ?,?,?,?,?,?,?,?,?,?,?,?,?

            )

        `,[

            order_number,

            client_id,

            driver_id,

            pickup_address,

            delivery_address,

            pickup_date,

            pickup_time,

            delivery_date,

            delivery_time,

            pallets_count,

            description,

            notes,

            status || "pending"

        ]);

        return result.insertId;

    },



    async updateOrder(id,data){

        const{

            driver_id,

            pickup_address,

            delivery_address,

            pickup_date,

            pickup_time,

            delivery_date,

            delivery_time,

            pallets_count,

            description,

            notes,

            status

        }=data;


        const[result]=await db.query(`

            UPDATE orders

            SET

                driver_id=?,

                pickup_address=?,

                delivery_address=?,

                pickup_date=?,

                pickup_time=?,

                delivery_date=?,

                delivery_time=?,

                pallets_count=?,

                description=?,

                notes=?,

                status=?

            WHERE id=?

        `,[

            driver_id,

            pickup_address,

            delivery_address,

            pickup_date,

            pickup_time,

            delivery_date,

            delivery_time,

            pallets_count,

            description,

            notes,

            status,

            id

        ]);

        return result;

    },



    async deleteOrder(id){

        const[result]=await db.query(

            "DELETE FROM orders WHERE id=?",

            [id]

        );

        return result;

    },



    async assignDriver(orderId,driverId){

        const[result]=await db.query(`

            UPDATE orders

            SET

                driver_id=?,

                status='assigned'

            WHERE id=?

        `,[driverId,orderId]);

        return result;

    },



    async updateStatus(orderId,status){

        const[result]=await db.query(`

            UPDATE orders

            SET status=?

            WHERE id=?

        `,[status,orderId]);

        return result;

    },



    async insertStatusHistory(orderId,status,userId,comment){

        await db.query(`

            INSERT INTO order_status_history(

                order_id,

                status,

                changed_by,

                comment

            )

            VALUES(?,?,?,?)

        `,[

            orderId,

            status,

            userId,

            comment

        ]);

    }

};

module.exports=OrderModel;