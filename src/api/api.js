import { error } from "ajv/dist/vocabularies/applicator/dependencies";
import { Alert } from "react-bootstrap";
import { getSession } from "./Auth";

export async function getWorker(){
    try{
        const session = await getSession();
        const token = session.session.session_token;
        const response = await fetch('https://droneark.bsi.co.id/api/users/user/getworker',{
            method: "GET",
            headers:
                {
                    "Content-Type": "application/json",
                    "Authorization":`Bearer ${token}`
                }
            }
        )

        const data = await response.json();
        if(data.status !== 200){
            throw new Error("failed to fecth worker");
        }

        return data;
    }catch (error){
        console.log("can't fetch worker, ",error);
    }
}

export async function createUser(){
    try{

    }catch{

    }
}

export async function editUser(){
    try{

    }catch{

    }
}

export async function deleteUser(){
    try{

    }catch{

    }
}

