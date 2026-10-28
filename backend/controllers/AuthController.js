const async = require("async");
const usersModel = require("../models").users;
const Op = require('sequelize').Op;

module.exports = {
  //Start: Method to authenticate a user
  authenticate(req, res) {
    const email = req.body.requestObject.email;
    let userObject = {};
  
    console.log("++++++++++++", userObject);
  
    return usersModel
      .findOne({
        where: {
          email: email,
          active: "Active",
        },
      })
      .then((userData) => {
        if (!userData) {
          return res.status(200).send({
            status: false,
            message: `Wrong email.`,
            type: `email`,
          });
        } else {
          userData = userData.get();
          userObject.usr = userData;
          console.log("llllllllllllllllllllll", userData);
  
          // Since rolePrivilegeModel and privilegeModel are removed,
          // directly respond with the user data.
          return res.status(200).send({
            status: true,
            message: userObject,
          });
        }
      })
      .catch((error) => {
        console.log(error);
        return res.status(500).send({ status: false, message: error });
      });
  },
  //End


  verifyEmail(req, res){
      var emailID = req.body.requestObject;

      if(emailID===null || emailID===''){
        return res.status(400).send({'error':'Something went wrong'});
      }
      return usersModel
        .findOne({
          where: {
            email: emailID,
          },
          attributes: [
            "email",
          ]
        })
        .then(emailData => {
          if(!emailData){
            return res.status(200).send({ message: "notExist" });
          } else {
            return res.status(200).send({ message: "exist" });
          }
          // return res.status(200).send({ message: "exist" });
        })
        .catch(error => {
          console.log(error);
          return res.status(400).send(error);
        });
    },

  getUserList(req, res){
      let query={
          raw: true,
          order: [
              ['position', 'ASC']
            ],
            where: {
              role: { [Op.ne]: "head_office" }
            }
      }

  console.log("Query is==========> ",query);
  return usersModel
    .findAll(query)
    .then(user => {
      return res.status(200).send(user);
    })
    .catch(error => {
      console.log(error);
      return res.status(400).send(error);
    });

  },

    
};
