import { storage } from "@/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export const uploadPhoto = async (file, folderName) => {
  if (!file || !folderName) {
    console.error("File or folderName is missing for upload.");
    return null;
  }

  // Use the folderName (which will be the documentId for existing members)
  const storageRef = ref(storage, `members/${folderName}/profile-photo`);

  try {
    const snapshot = await uploadBytes(storageRef, file);
    console.log("Photo uploaded successfully!");

    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading photo:", error);
    return null;
  }
};
