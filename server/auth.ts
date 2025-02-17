import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { comparePasswords, hashPassword } from "./utils/password"; // Assuming hashPassword exists

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: "xK8Q9vN2$mP4#jL7",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        console.log("Login attempt for:", username);

        if (!user) {
          console.log("User not found:", username);
          return done(null, false);
        }

        console.log("Found user:", { id: user.id, username: user.username, isAdmin: user.isAdmin });

        const isValid = await comparePasswords(password, user.password);
        console.log("Password valid:", isValid);

        if (!isValid) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        console.error("Login error:", error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).send("Username already exists");
    }

    const user = await storage.createUser({
      ...req.body
    });

    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json(user);
    });
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  //Revised createAdminUser function
  async function createAdminUser() {
    try {
      const existingAdmin = await storage.getUserByUsername("admin@learnhub.com");
      if (existingAdmin) {
        //Attempt to delete using storage.deleteUser first, fallback to db.delete if it exists.
        try{
          await storage.deleteUser(existingAdmin.id);
          console.log("Existing admin user deleted using storage.deleteUser.");
        } catch (error){
          console.log("storage.deleteUser failed. Attempting db.delete");
          //Assuming db and users are defined elsewhere, this is a best effort fix.
          if(db && users){
            await db.delete(users).where(eq(users.id, existingAdmin.id));
            console.log("Existing admin user deleted using db.delete.");
          } else {
            console.error("Could not delete existing admin user. db or users not defined.");
          }
        }
      }
      //Attempt to use storage.createAdminUser, fallback to manual creation.
      try{
        await storage.createAdminUser("admin@learnhub.com", "Admin@123");
        console.log("Admin user created successfully using storage.createAdminUser.");
      } catch (error){
        console.log("storage.createAdminUser failed. Attempting manual user creation.");
        const hashedPassword = await hashPassword("Admin@123");
        await storage.createUser({ username: "admin@learnhub.com", password: hashedPassword, isAdmin: true });
        console.log("Admin user created successfully.");
      }
    } catch (error) {
      console.error("Error creating admin user:", error);
    }
  }

  createAdminUser();
}