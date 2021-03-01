const { User }          = require('../../models');
const authService       = require('../../services/auth.service');
const  fcmService       = require('../../services/fcm.notification.services'); 
const { to, ReE, ReS }  = require('../../services/util.service');

//new code
var response = require('../../response/res');
var connection = require('../../config/conn');
//

const create = async function(req, res){
    res.setHeader('Content-Type', 'application/json');
    const body = req.body;

    if(!body.unique_key && !body.email && !body.phone){
        return ReE(res, 'Please enter an email or phone number to register.');
    } else if(!body.password){
        return ReE(res, 'Please enter a password to register.');
    }else{
        let err, user;
        console.log(body);
        [err, user] = await to(authService.createUser(body));

        if(err) return ReE(res, err, 422);
        
        res.io.emit("newregistered", user);
        return ReS(res, {
            message:'Successfully created new user.', 
            user:user.toWeb(), 
            token:user.getJWT()}, 
            201
            );
    }
}
module.exports.create = create;

const get = async function(req, res){
    // console.log("disini param" +req.params.user_id);
    res.setHeader('Content-Type', 'application/json');
    // let user = req.user;
    let err, users;

    [err, users] = await to(User.findOne({
        where: {
          id: req.params.id
        }
      }));
    if(err) return ReE(res, err, 422);

    return ReS(res, {message:'Successfully Load Detail Users', data:users}, 201);
}
module.exports.get = get;

const getAll = async function(req, res){
    res.setHeader('Content-Type', 'application/json');
    let err, users;

    [err, users] = await to(User.findAll());
    if(err) return ReE(res, err, 422);

    return ReS(res, {message:'Successfully Load Users List', data:users}, 201);
}
module.exports.getAll = getAll;

const update = async function(req, res){

    let err, user, data;
    data = req.body;

    [err, user] = await to(User.update(
        data,
        {where: {id: data.id} }
    ));
    if(err) return ReE(res, err, 422);

    [err, user] = await to(User.findOne({where: {id: data.id} }));
    if(err) return ReE(res, err, 422);

    return ReS(res, {message:'Successfully Update Detail Users', data:user}, 201);
}
module.exports.update = update;

const blockUser = async function(req, res){

    let err, user, data;
    data = req.body;

    [err, user] = await to(User.update(
        {status: 2},
        {where: {id: data.id} }
    ));
    if(err) return ReE(res, err, 422);

    [err, user] = await to(User.findOne({where: {id: data.id} }));
    if(err) return ReE(res, err, 422);

    return ReS(res, {message:'The Select User Have Been Blocked', data:user}, 201);
}
module.exports.blockUser = blockUser;

const remove = async function(req, res){
    let user, err;

    [err, user] = await to(User.destroy({
        where: {
          id: req.params.id
        }
      }));
      if(err) return ReE(res, err, 422);

    if(err) return ReE(res, 'error occured trying to delete the User');

    return ReS(res, {message:'Successfully Delete User', data:user}, 201);
}
module.exports.remove = remove;

const login = async function(req, res){
    let err, user;

    [err, user] = await to(authService.authUser(req.body));
    if(err) return ReE(res, err, 422);
    res.io.emit("login", user);
    if(user.fcm_reg_code === "" || user.fcm_reg_code === "0" ||  user.fcm_reg_code === null || user.fcm_reg_code != req.body.fcm_reg_code) {
        user.set(
            {
                fcm_reg_code: req.body.fcm_reg_code
            }
        )
        [err, user] = await to(user.save());
        if(err) return ReE(res, err, 422);
    }
    let mess = {
        to : user.fcm_reg_code,
        title : 'A user has been login',
        body : user.first + ' ' + user.last + ' has been login',
        isLogin: "true"

    }
    let getFcmService =  fcmService.sendNotification(mess);
    
    console.log(getFcmService);

    if(getFcmService == false ) return ReE(res, 'error occured trying to send nitification');

    return ReS(res, {token:user.getJWT(), user:user.toWeb()});
}
module.exports.login = login;


//new code
//Dashboard
const listDashboard = async function(req,res){
    var userid = req.body.userid;
    connection.query("SELECT (SELECT count(usr.id) AS total_users FROM Users usr) AS total_users, (SELECT count(bds.id) AS total_users FROM BiddingTransactions bds) AS total_bids, (SELECT count(str.id) AS total_users FROM Stores str) AS total_rooms",function(error,rows,
        fields){
            if(error){
                console.log(error);
            }else{
                response.ok(rows,res)
            }
        });
};

module.exports.listDashboard = listDashboard;

//category
const listCategory = async function(req,res){
    var userid = req.body.userid;
    connection.query("SELECT * FROM Categories ORDER BY id DESC",function(error,rows,
        fields){
            if(error){
                console.log(error);
            }else{
                response.ok(rows,res)
            }
        });
};
module.exports.listCategory = listCategory;
//add category
const addCategory = async function(req,res){
    // var userid = req.body.userid;
    var name = req.body.name;
    var description = req.body.description;
    var status = 1;

    let sql = "INSERT INTO Stores (name, description, status) VALUES ('"+name+"','"+description+"','"+status+"')";
    console.log(sql);
    connection.query(sql,function(error,rows,
        fields){
            if(error){
                console.log(error);
            }else{
                response.ok(rows,res)
            }
        });
};
module.exports.addCategory = addCategory;
//detail category
const detailCategory = async function(req,res){
    var userid = req.body.userid;
    var id = req.body.id;
    connection.query("SELECT * FROM Categories WHERE md5(id) = ?",[id],function(error,rows,
        fields){
            if(error){
                console.log(error);
            }else{
                response.ok(rows,res)
            }
        });
};
module.exports.detailCategory = detailCategory;

//updatecategory
const updateCategory = async function(req,res){
    // var userid = req.body.userid;
    var id = req.body.id;

    var name = req.body.name;
    var description = req.body.description;
    var status = req.body.status;
    var updatedAt = req.body.updatedAt;

    let sql = "UPDATE Categories SET name='"+name+"',description='"+description+"',status='"+status+"',updatedAt='"+updatedAt+"' WHERE md5(id)='"+id+"'";
    connection.query(sql,function(error,rows,
        fields){
            if(error){
                console.log(error);
            }else{
                response.ok(rows,res)
            }
        });
};
module.exports.updateCategory = updateCategory;

//room
const listRoom = async function(req,res){
    var userid = req.body.userid;
    connection.query("SELECT str.id,prd.name AS product_name,ky.name AS keys_name,str.startBid,str.endBid,usr.first,str.createdAt FROM Stores str INNER JOIN Products prd ON str.productId = prd.id INNER JOIN `Keys` ky ON str.allowKey = ky.id LEFT JOIN Users usr ON str.userWinner = usr.id",function(error,rows,
        fields){
            if(error){
                console.log(error);
            }else{
                response.ok(rows,res)
            }
        });
};
module.exports.listRoom = listRoom;
//add room
const addRoom = async function(req,res){
    var userid = req.body.userid;
    var id = req.body.id;

    var productId = req.body.productId;
    var allowKey = req.body.allowKey;
    var startBid = req.body.startBid;
    var endBid = req.body.endBid;
    var setWinnerDate = req.body.setWinnerDate;
    var maxxBidder = req.body.maxxBidder;
    var createdAt = req.body.createdAt;

    let sql = "INSERT INTO Stores (productId, allowKey, startBid, endBid, setWinnerDate,maxBidder,createdAt) VALUES ('"+productId+"','"+allowKey+"','"+startBid+"','"+endBid+"','"+setWinnerDate+"','"+maxxBidder+"','"+createdAt+"')";
    console.log(sql);
    connection.query(sql,function(error,rows,
        fields){
            if(error){
                console.log(error);
            }else{
                response.ok(rows,res)
            }
        });
};
module.exports.addRoom = addRoom;
//detail room
const detailRoom = async function(req,res){
    var userid = req.body.userid;
    var id = req.body.id;
    connection.query("SELECT str.id,str.productId,prd.name AS productName,str.allowKey,ky.name AS keyName,str.startBid,str.endBid,str.setWinnerDate,str.maxBidder FROM Stores str INNER JOIN Products prd ON str.productId = prd.id INNER JOIN `Keys` ky ON str.allowKey = ky.id WHERE md5(str.id) = ?",[id],function(error,rows,
        fields){
            if(error){
                console.log(error);
            }else{
                response.ok(rows,res)
            }
        });
};
module.exports.detailRoom = detailRoom;
//update room
const updateRoom = async function(req,res){
    
    var id = req.body.id;
    var productId = req.body.productId;
    var allowKey = req.body.allowKey;
    var startBid = req.body.startBid;
    var endBid = req.body.endBid;
    var setWinnerDate = req.body.setWinnerDate;
    var maxBidder = req.body.maxBidder;
    var updatedAt = req.body.updatedAt;

    let sql = "UPDATE Stores SET productId='"+productId+"',allowKey='"+allowKey+"',startBid='"+startBid+"',endBid='"+endBid+"',setWinnerDate='"+setWinnerDate+"',maxBidder='"+maxBidder+"',updatedAt='"+updatedAt+"' WHERE md5(id)='"+id+"'";
    connection.query(sql,function(error,rows,
        fields){
            if(error){
                console.log(error);
            }else{
                response.ok(rows,res)
            }
        });
};
module.exports.updateRoom = updateRoom;
//
//products
const listProducts = async function(req,res){
    var userid = req.body.userid;
    connection.query("SELECT pr.id,pr.name,pr.categoryId,pr.description,pr.price,pr.images,pr.images1,pr.images2,pr.images3,pr.status,pr.createdAt,pr.updatedAt,ct.name AS categoryName FROM Products pr INNER JOIN Categories ct ON ct.id = pr.categoryId ORDER BY pr.id DESC",function(error,rows,
        fields){
            if(error){
                console.log(error);
            }else{
                response.ok(rows,res)
            }
        });
};

module.exports.listProducts = listProducts;
//add products
const addProducts = async function(req,res){
    var userid = req.body.userid;
    var id = req.body.id;

    var name = req.body.name;
    var categoryId = req.body.categoryId;
    var description = req.body.description;
    var price = req.body.price;
    var images = req.body.images;
    var images1 = req.body.images1;
    var images2 = req.body.images2;
    var images3 = req.body.images3;
    var createdAt = req.body.createdAt;

    var typeimage = req.body.typeimage;
    var sizeimage = req.body.sizeimage;

    let sql = "INSERT INTO Products (name, categoryId, description, price, images, images1,images2,images3,createdAt,status) VALUES ('"+name+"','"+categoryId+"','"+description+"','"+price+"','"+images+"','"+images1+"','"+images2+"','"+images3+"','"+createdAt+"',1)";
    
    connection.query(sql,function(error,rows,
        fields){
            if(error){
                console.log(error);
            }else{
                var insertId = rows.insertId;
                let sql_insert = "INSERT INTO Uploads (content, contentId, type, name, data, createdAt) VALUES ('"+name+"','"+insertId+"','"+typeimage+"','"+images+"','"+sizeimage+"','"+createdAt+"')";
                console.log(sql_insert);
                connection.query(sql_insert,function(error,rows,
                    fields){
                        if(error){
                            console.log(error);
                        }else{
                            response.ok(rows,res)
                        }
                    });
            }
        });
};
module.exports.addProducts = addProducts;
//detail products
const detailProducts = async function(req,res){
    var userid = req.body.userid;
    var id = req.body.id;
    connection.query("SELECT pr.id,pr.name,pr.categoryId,pr.description,pr.price,pr.images,pr.images1,pr.images2,pr.images3,pr.status,pr.createdAt,pr.updatedAt,ct.name AS categoryName FROM Products pr INNER JOIN Categories ct ON ct.id = pr.categoryId WHERE md5(pr.id) = ?",[id],function(error,rows,
        fields){
            if(error){
                console.log(error);
            }else{
                response.ok(rows,res)
            }
        });
};
module.exports.detailProducts = detailProducts;
//update products
const updateProducts = async function(req,res){
    var userid = req.body.userid;
    var id = req.body.id;

    var name = req.body.name;
    var description = req.body.description;
    var categoryId = req.body.categoryId;
    var price = req.body.price;
    var images = req.body.images;
    var images1 = req.body.images1;
    var images2 = req.body.images2;
    var images3 = req.body.images3;
    var status = req.body.status;
    var updatedAt = req.body.updatedAt;

    let sql = "UPDATE Products SET name='"+name+"',description='"+description+"',categoryId='"+categoryId+"',price='"+price+"',images='"+images+"',images1='"+images1+"',images2='"+images2+"',images3='"+images3+"',status='"+status+"',updatedAt='"+updatedAt+"' WHERE md5(id)='"+id+"'";
    connection.query(sql,function(error,rows,
        fields){
            if(error){
                console.log(error);
            }else{
                // response.ok(rows,res)
                let sql_update = "UPDATE Uploads SET content='"+name+"',name='"+images+"',updatedAt='"+updatedAt+"' WHERE md5(contentId)='"+id+"'";
                connection.query(sql_update,function(error,rows,
                    fields){
                        if(error){
                            console.log(error);
                        }else{
                            response.ok(rows,res)
                        }
                    });
            }
        });
};
module.exports.updateProducts = updateProducts;
//end products

//users
const listUser = async function(req,res){
    var userid = req.body.userid;
    connection.query("SELECT usr.id,usr.first,usr.last,usr.email,usr.phone,rl.name AS role_name,usr.roleId As role_id,usr.status FROM Users usr INNER JOIN Roles rl ON usr.roleId = rl.id",function(error,rows,
        fields){
            if(error){
                console.log(error);
            }else{
                response.ok(rows,res)
            }
        });
};
module.exports.listUser = listUser;


//getsingleuser
const detailUser = async function(req,res){
    var userid = req.body.userid;
    var id = req.body.id;
    connection.query("SELECT usr.id,usr.first,usr.last,usr.email,usr.phone,usr.address,usr.city,usr.zipcode,usr.state,usr.country,usr.birthdate,usr.roleId AS role_id,rl.name AS role_name,usr.status FROM Users usr INNER JOIN Roles rl ON rl.id = usr.roleId WHERE usr.id = ?",[id],function(error,rows,
        fields){
            if(error){
                console.log(error);
            }else{
                response.ok(rows,res)
            }
        });
};
module.exports.detailUser = detailUser;

//updateuser
const updateUser = async function(req,res){
    var userid = req.body.userid;
    var id = req.body.id;

    var first = req.body.first;
    var last = req.body.last;
    // var birthdate = req.body.birthdate;
    var phone = req.body.phone;
    var email = req.body.email;
    var address = req.body.address;
    var city = req.body.city;
    var zipcode = req.body.zipcode;
    var state = req.body.state;
    var country = req.body.country;
    var role_id = req.body.role_id;
    var status = req.body.status;

    let sql = "UPDATE Users SET first='"+first+"',last='"+last+"',phone='"+phone+"',email='"+email+"',address='"+address+"',city='"+city+"',zipcode='"+zipcode+"',state='"+state+"',country='"+country+"',status='"+status+"' WHERE id="+id;
    connection.query(sql,function(error,rows,
        fields){
            if(error){
                console.log(error);
            }else{
                response.ok(rows,res)
            }
        });
};
module.exports.updateUser = updateUser;


//roles
const listRole = async function(req,res){
    var userid = req.body.userid;
    connection.query("SELECT * FROM Roles",function(error,rows,
        fields){
            if(error){
                console.log(error);
            }else{
                response.ok(rows,res)
            }
        });
};

module.exports.listRole = listRole;

//keys
const listKey = async function(req,res){
    var userid = req.body.userid;
    connection.query("SELECT * FROM `Keys`",function(error,rows,
        fields){
            if(error){
                console.log(error);
            }else{
                response.ok(rows,res)
            }
        });
};
module.exports.listKey = listKey;
//getsinglekeys
const detailKey = async function(req,res){
    var userid = req.body.userid;
    var id = req.body.id;
    connection.query("SELECT * FROM `Keys` WHERE id = ?",[id],function(error,rows,
        fields){
            if(error){
                console.log(error);
            }else{
                response.ok(rows,res)
            }
        });
};
module.exports.detailKey = detailKey;
//updatekeys
const updateKey = async function(req,res){
    var userid = req.body.userid;
    var id = req.body.id;

    var name = req.body.name;
    var description = req.body.description;
    var discount = req.body.discount;
    var price = req.body.price;
    var disc_valid_from = req.body.disc_valid_from;
    var disc_valid_to = req.body.disc_valid_to;
    var status = req.body.status;

    let sql = "UPDATE `Keys` SET name='"+name+"',description='"+description+"',discount='"+discount+"',price='"+price+"',status='"+status+"',disc_valid_from='"+disc_valid_from+"',disc_valid_to='"+disc_valid_to+"' WHERE id="+id;
    connection.query(sql,function(error,rows,
        fields){
            if(error){
                console.log(error);
            }else{
                response.ok(rows,res)
            }
        });
};
module.exports.updateKey = updateKey;


//shipping
const listShipping = async function(req,res){
    var userid = req.body.userid;
    // let sql = "SELECT sd.id, usr.email, sd.firstName, sd.lastname, sd.email, sd.phoneNumber, sd.address, sd.city, sd.city, sd.zipPostCode, sd.zipPostCode, sd.country, sd.createdAt FROM ShippingDetails sd INNER JOIN ShippingTypes st ON sd.shippingType = st.id INNER JOIN Users usr ON usr.id = sd.userId ORDER BY sd.id DESC";
    let sql = "SELECT * FROM ShippingTypes"
    connection.query(sql,function(error,rows,
        fields){
            if(error){
                console.log(error);
            }else{
                response.ok(rows,res)
            }
        });
};
module.exports.listShipping = listShipping;
//add list shipping
const addlistShipping = async function(req,res){
    var userid = req.body.userid;
    var id = req.body.id;

    var shippingCode = req.body.shippingCode;
    var shippingName = req.body.shippingName;
    var shippingDescription = req.body.shippingDescription;
    var price = req.body.price;
    var country = req.body.country;
    var state = req.body.state;
    var estimate = req.body.estimate;
    var createdAt = req.body.createdAt;

    let sql = "INSERT INTO ShippingTypes (shippingCode, shippingName, shippingDescription, price, country, state, estimate, createdAt) VALUES ('"+shippingCode+"','"+shippingName+"','"+shippingDescription+"','"+price+"','"+country+"','"+state+"','"+estimate+"','"+createdAt+"')";
    console.log(sql);
    connection.query(sql,function(error,rows,
        fields){
            if(error){
                console.log(error);
            }else{
                response.ok(rows,res)
            }
        });
};
module.exports.addlistShipping = addlistShipping;
//detail shippingtype
const detailListShipping = async function(req,res){
    var userid = req.body.userid;
    var id = req.body.id;
    connection.query("SELECT * FROM ShippingTypes WHERE md5(id) = ?",[id],function(error,rows,
        fields){
            if(error){
                console.log(error);
            }else{
                response.ok(rows,res)
            }
        });
};
module.exports.detailListShipping = detailListShipping;
//update shippingtype
const updateShipping = async function(req,res){
    var userid = req.body.userid;
    var id_shipping = req.body.id;
    // console.log(id);
    var shippingCode = req.body.shippingCode;
    var shippingName = req.body.shippingName;
    var shippingDescription = req.body.shippingDescription;
    var price = req.body.price;
    var country = req.body.country;
    var estimate = req.body.estimate;
    var state = req.body.state;
    var updatedAt = req.body.updatedAt;

    let sql = "UPDATE ShippingTypes SET shippingCode='"+shippingCode+"',shippingName='"+shippingName+"',shippingDescription='"+shippingDescription+"',price='"+price+"',country='"+country+"',estimate='"+estimate+"',state='"+state+"',updatedAt='"+updatedAt+"' WHERE md5(id)='"+id_shipping+"'";
    console.log(sql);
    connection.query(sql,function(error,rows,
        fields){
            if(error){
                console.log(error);
            }else{
                response.ok(rows,res)
            }
        });
};
module.exports.updateShipping = updateShipping;


///

//promotionkey
const listPromotion = async function(req,res){
    var userid = req.body.userid;
    connection.query("SELECT pk.id,pk.title_promo,pk.desc_promo,pk.amount,pg.title_page,DATE_FORMAT(pk.valid_from,'%Y-%m-%d') AS valid_from,DATE_FORMAT(pk.valid_to,'%Y-%m-%d') AS valid_to,pk.status,ky.name AS key_name FROM PromotionKey pk INNER JOIN Page pg ON pg.id = pk.pageid INNER JOIN `Keys` ky ON ky.id = pk.key_id ORDER BY pk.id DESC",function(error,rows,
        fields){
            if(error){
                console.log(error);
            }else{
                response.ok(rows,res)
            }
        });
};
module.exports.listPromotion = listPromotion;

//getsinglepromotionkey
const detailPromotion = async function(req,res){
    var userid = req.body.userid;
    var id = req.body.id;
    connection.query("SELECT pk.id,pk.title_promo,pk.desc_promo,pk.amount,pk.status,DATE_FORMAT(pk.valid_from,'%Y-%m-%d') AS valid_from,DATE_FORMAT(pk.valid_to,'%Y-%m-%d') AS valid_to,pk.key_id,ky.name AS key_name FROM PromotionKey pk INNER JOIN `Keys` ky ON ky.id = pk.key_id  WHERE pk.id = ?",[id],function(error,rows,
        fields){
            if(error){
                console.log(error);
            }else{
                response.ok(rows,res)
            }
        });
};
module.exports.detailPromotion = detailPromotion;
//update promotionkey
const updatePromotion = async function(req,res){
    var userid = req.body.userid;
    var id = req.body.id;
    console.log(id)
    var title_promo = req.body.title_promo;
    var desc_promo = req.body.desc_promo;
    var key_id = req.body.key_id;
    var amount = req.body.amount;
    var valid_from = req.body.valid_from;
    var valid_to = req.body.valid_to;
    var status = req.body.status;

    let sql = "UPDATE PromotionKey SET title_promo='"+title_promo+"',desc_promo='"+desc_promo+"',amount='"+amount+"',valid_from='"+valid_from+"',valid_to='"+valid_to+"',status='"+status+"',key_id='"+key_id+"' WHERE id='"+id+"'";
    connection.query(sql,function(error,rows,
        fields){
            if(error){
                console.log(error);
            }else{
                response.ok(rows,res)
            }
        });
};
module.exports.updatePromotion = updatePromotion;
//add promotion
const addPromotion = async function(req,res){
    var userid = req.body.userid;
    var id = req.body.id;

    var title_promo = req.body.title_promo;
    var desc_promo = req.body.desc_promo;
    var key_id = req.body.key_id;
    var amount = req.body.amount;
    var valid_from = req.body.valid_from;
    var valid_to = req.body.valid_to;

    let sql = "INSERT INTO PromotionKey (title_promo, desc_promo,key_id, amount, valid_from, valid_to,pageid) VALUES ('"+title_promo+"','"+desc_promo+"','"+key_id+"','"+amount+"','"+valid_from+"','"+valid_to+"',1)";
    console.log(sql);
    connection.query(sql,function(error,rows,
        fields){
            if(error){
                console.log(error);
            }else{
                response.ok(rows,res)
            }
        });
};
module.exports.addPromotion = addPromotion;

//getprofil
const getProfile = async function(req,res){
    var userid = req.body.userid;
    var id = req.body.id;
    connection.query("SELECT * FROM Users usr WHERE usr.id = ?",[id],function(error,rows,
        fields){
            if(error){
                console.log(error);
            }else{
                response.ok(rows,res)
            }
        });
};
module.exports.getProfile = getProfile;
//update profile
const updateProfile = async function(req,res){
    // var userid = req.body.userid;
    var id = req.body.id;

    var first = req.body.first;
    var last = req.body.last;
    var phone = req.body.phone;
    var address = req.body.address;
    var city = req.body.city;
    var zipcode = req.body.zipcode;
    var state = req.body.state;
    var country = req.body.country;
    var birthdate = req.body.birthdate;

    let sql = "UPDATE Users SET first='"+first+"',last='"+last+"',phone='"+phone+"',address='"+address+"',city='"+city+"',zipcode='"+zipcode+"',state='"+state+"',country='"+country+"',birthdate='"+birthdate+"' WHERE id='"+id+"'";
    console.log(sql);
    connection.query(sql,function(error,rows,
        fields){
            if(error){
                console.log(error);
            }else{
                response.ok(rows,res)
            }
        });
};
module.exports.updateProfile = updateProfile;

//listTransactions
const listTransactions = async function(req,res){
    var userid = req.body.userid;
    connection.query("SELECT bt.id, usr.first, usr.last, pr.name AS product_name, sts.statusName, DATE_FORMAT(bt.paymentDate,'%Y-%m-%d') AS payment_date, bt.nominal, DATE_FORMAT(bt.createdAt,'%Y-%m-%d') AS createdAt FROM BiddingTransactions bt INNER JOIN Stores st ON bt.storeId = st.id INNER JOIN Products pr ON bt.productId = pr.id INNER JOIN Users usr ON bt.buyerId = usr.id LEFT JOIN StatusDescs sts ON bt.paymentStatus = sts.statusCode ORDER BY bt.id DESC",function(error,rows,
        fields){
            if(error){
                console.log(error);
            }else{
                response.ok(rows,res)
            }
        });
};
module.exports.listTransactions = listTransactions;
//listTransactionsPayment
const listTransactionsPayment = async function(req,res){
    var userid = req.body.userid;
    connection.query("SELECT bt.id, usr.first, usr.last, pr.name AS product_name, sts.statusName, DATE_FORMAT(bt.paymentDate,'%Y-%m-%d') AS payment_date, bt.nominal, DATE_FORMAT(bt.createdAt,'%Y-%m-%d') AS createdAt FROM BiddingTransactions bt INNER JOIN Stores st ON bt.storeId = st.id INNER JOIN Products pr ON bt.productId = pr.id INNER JOIN Users usr ON bt.buyerId = usr.id LEFT JOIN StatusDescs sts ON bt.paymentStatus = sts.statusCode WHERE sts.statusType = 'payment' ORDER BY bt.id DESC",function(error,rows,
        fields){
            if(error){
                console.log(error);
            }else{
                response.ok(rows,res)
            }
        });
};
module.exports.listTransactionsPayment = listTransactionsPayment;
//listTransactionsOrder
const listTransactionsOrder = async function(req,res){
    var userid = req.body.userid;
    connection.query("SELECT bt.id, usr.first, usr.last, pr.name AS product_name, sts.statusName, DATE_FORMAT(bt.paymentDate,'%Y-%m-%d') AS payment_date, bt.nominal, DATE_FORMAT(bt.createdAt,'%Y-%m-%d') AS createdAt FROM BiddingTransactions bt INNER JOIN Stores st ON bt.storeId = st.id INNER JOIN Products pr ON bt.productId = pr.id INNER JOIN Users usr ON bt.buyerId = usr.id LEFT JOIN StatusDescs sts ON bt.paymentStatus = sts.statusCode WHERE sts.statusType = 'order' ORDER BY bt.id DESC",function(error,rows,
        fields){
            if(error){
                console.log(error);
            }else{
                response.ok(rows,res)
            }
        });
};
module.exports.listTransactionsOrder = listTransactionsOrder;
//listTransactionsDelivery
const listTransactionsDelivery = async function(req,res){
    var userid = req.body.userid;
    connection.query("SELECT bt.id, usr.first, usr.last, pr.name AS product_name, sts.statusName, DATE_FORMAT(bt.paymentDate,'%Y-%m-%d') AS payment_date, bt.nominal, DATE_FORMAT(bt.createdAt,'%Y-%m-%d') AS createdAt FROM BiddingTransactions bt INNER JOIN Stores st ON bt.storeId = st.id INNER JOIN Products pr ON bt.productId = pr.id INNER JOIN Users usr ON bt.buyerId = usr.id LEFT JOIN StatusDescs sts ON bt.paymentStatus = sts.statusCode WHERE sts.statusType = 'delivery' ORDER BY bt.id DESC",function(error,rows,
        fields){
            if(error){
                console.log(error);
            }else{
                response.ok(rows,res)
            }
        });
};
module.exports.listTransactionsDelivery = listTransactionsDelivery;
//updateTransactions
const updateTransactions = async function(req,res){
    // var userid = req.body.userid;
    var id = req.body.id;
    var paymentStatus = req.body.paymentStatus;
    var updatedAt = req.body.updatedAt;

    let sql = "UPDATE BiddingTransactions SET paymentStatus='"+paymentStatus+"',updatedAt='"+updatedAt+"' WHERE id='"+id+"'";
    console.log(sql);
    connection.query(sql,function(error,rows,
        fields){
            if(error){
                console.log(error);
            }else{
                response.ok(rows,res)
            }
        });
};
module.exports.updateTransactions = updateTransactions;
//getsinglepromotionkey
const detailTransactions = async function(req,res){
    var userid = req.body.userid;
    var id = req.body.id;
    connection.query("SELECT bt.id, usr.first, usr.last, pr.name AS product_name, sts.statusName AS status_name, sts.statusCode AS status_code, DATE_FORMAT(bt.paymentDate,'%Y-%m-%d') AS payment_date, bt.nominal, DATE_FORMAT(bt.createdAt,'%Y-%m-%d') AS createdAt FROM BiddingTransactions bt INNER JOIN Stores st ON bt.storeId = st.id INNER JOIN Products pr ON bt.productId = pr.id INNER JOIN Users usr ON bt.buyerId = usr.id LEFT JOIN StatusDescs sts ON bt.paymentStatus = sts.statusCode WHERE bt.id = ?",[id],function(error,rows,
        fields){
            if(error){
                console.log(error);
            }else{
                response.ok(rows,res)
            }
        });
};
module.exports.detailTransactions = detailTransactions;

//listStatusTransactions
const listStatusTransactions = async function(req,res){
    connection.query("SELECT * FROM StatusDescs",function(error,rows,
        fields){
            if(error){
                console.log(error);
            }else{
                response.ok(rows,res)
            }
        });
};
module.exports.listStatusTransactions = listStatusTransactions;
