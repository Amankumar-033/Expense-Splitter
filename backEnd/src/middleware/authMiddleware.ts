import jwt from 'jsonwebtoken';
import {Request, Response, NextFunction} from 'express';


export interface AuthRequest extends Request{
    user?: any;
    file?: any;
}


export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    let token;

    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')){
        //Token from frontend comes in the request header 
        try{
            token = req.headers.authorization.split(' ')[1];
            const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
            req.user = {
                _id: decoded.id,
                id: decoded.id
            };
            next();
        }
        catch(error){
            console.error("Token verification failed", error);
            res.status(401).json({message: "Not authorized, token failed"});
        }
    }

    if(!token){
        res.status(401).json({message: "Not authorized, no token provided"});
    }
}