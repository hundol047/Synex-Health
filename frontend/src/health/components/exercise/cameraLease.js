// One camera owner per app window, including pending permission requests.
let owner;
export function claimCamera(release){
 const previous=owner;owner=null;previous?.release();
 const lease={release};owner=lease;
 return ()=>{if(owner===lease)owner=null;};
}
