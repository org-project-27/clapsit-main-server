import bcrypt from "bcrypt";

function createHash(password: any) {
 bcrypt.hash(password, 10, (err: any, hash: any) => {
    if (err) {
      return err;
    }
    return hash;
  });
}

function checkHash(hashedPassword: any, plainPassword: any) {
  bcrypt.compare(plainPassword, hashedPassword, (err: any, result: any) => {
    if (err) {
      return err;
    }
    return { compare: result }

  });
}

module.exports = { createHash, checkHash }
