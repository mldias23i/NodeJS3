/* const fs = require('fs');

const deleteFile = (filePath) => {
    fs.unlink(filePath, (err) => {
        if(err) {
            throw (err);
        }
    });
}

exports.deleteFile = deleteFile; */

const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
    region: 'eu-west-3',
    credentials: {
        accessKeyId: process.env.AWS_KEY,
        secretAccessKey: process.env.AWS_KEY_SECRET
    }
});

const deleteFile = (filePath) => {
    const bucketName = 'nodejsimagestorage';
    const fileKey = filePath;

    const deleteCommand = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: fileKey
    });

    s3.send(deleteCommand)
        .then(() => {
            console.log('File deleted successfully from S3');
        })
        .catch((err) => {
            console.log('Error deleting file from S3:', err);
            throw err;
        });
};

exports.deleteFile = deleteFile;