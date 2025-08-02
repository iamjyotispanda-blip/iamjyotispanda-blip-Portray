import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Crop as CropIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactCrop, { Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ObjectUploaderProps {
  value?: string;
  onChange: (value: string) => void;
  accept?: string;
  maxSize?: number; // in MB
  className?: string;
}

export function ObjectUploader({
  value,
  onChange,
  accept = "image/*",
  maxSize = 5,
  className,
}: ObjectUploaderProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [crop, setCrop] = useState<Crop>();
  const [showCrop, setShowCrop] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 80,
        },
        1, // aspect ratio 1:1 for square logos
        width,
        height,
      ),
      width,
      height,
    ));
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `Please select a file smaller than ${maxSize}MB`,
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setShowCrop(false); // Start with preview, then show crop
    setIsDialogOpen(true);
  };

  const handleShowCrop = () => {
    setShowCrop(true);
  };

  const getCroppedFile = async (): Promise<File | null> => {
    if (!imgRef.current || !crop || !selectedFile) return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const image = imgRef.current;
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(null);
          return;
        }
        const croppedFile = new File([blob], selectedFile.name, {
          type: selectedFile.type,
        });
        resolve(croppedFile);
      }, selectedFile.type, 0.95);
    });
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      // Get cropped file if cropping was used
      let fileToUpload = selectedFile;
      if (showCrop && crop) {
        const croppedFile = await getCroppedFile();
        if (croppedFile) {
          fileToUpload = croppedFile;
        }
      }

      // Get auth token from localStorage
      const token = localStorage.getItem('auth_token');
      
      // Get presigned URL
      const response = await fetch("/api/objects/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { uploadURL } = await response.json();

      // Upload file to object storage
      const uploadResponse = await fetch(uploadURL, {
        method: "PUT",
        body: fileToUpload,
        headers: {
          "Content-Type": fileToUpload.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file");
      }

      // Extract the object path from the upload URL
      const objectPath = `/objects/uploads/${uploadURL.split('/uploads/')[1].split('?')[0]}`;
      
      onChange(objectPath);
      setIsDialogOpen(false);
      setSelectedFile(null);
      setPreviewUrl("");
      setShowCrop(false);

      toast({
        title: "Upload successful",
        description: "File has been uploaded successfully",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    onChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedFile(null);
    setPreviewUrl("");
    setShowCrop(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={className}>
      <div className="space-y-3">
        {value && (
          <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
            <img 
              src={value} 
              alt="Uploaded file" 
              className="w-12 h-12 object-cover rounded border"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.setAttribute('style', 'display: flex;');
              }}
            />
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded border flex items-center justify-center" style={{ display: 'none' }}>
              <ImageIcon className="w-5 h-5 text-gray-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">File uploaded</p>
              <p className="text-xs text-gray-500">Click to change or upload a new file</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemove}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
        
        <div className="flex items-center space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={triggerFileSelect}
            className="flex-1"
          >
            <Upload className="w-4 h-4 mr-2" />
            {value ? "Change File" : "Upload File"}
          </Button>
        </div>
        
        <p className="text-xs text-gray-500">
          Upload an image file (PNG, JPG). Maximum size: {maxSize}MB
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{showCrop ? "Crop Image" : "Upload File"}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {previewUrl && !showCrop && (
              <div className="flex justify-center">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-w-full max-h-64 object-contain rounded border"
                />
              </div>
            )}

            {previewUrl && showCrop && (
              <div className="flex justify-center">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  aspect={1} // Square aspect ratio for logos
                  className="max-w-full"
                >
                  <img
                    ref={imgRef}
                    src={previewUrl}
                    alt="Crop preview"
                    onLoad={onImageLoad}
                    className="max-w-full max-h-96 object-contain"
                  />
                </ReactCrop>
              </div>
            )}
            
            {selectedFile && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p><strong>File:</strong> {selectedFile.name}</p>
                <p><strong>Size:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                <p><strong>Type:</strong> {selectedFile.type}</p>
              </div>
            )}
            
            <div className="flex justify-between">
              <div className="flex space-x-2">
                {!showCrop && selectedFile && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleShowCrop}
                    disabled={isUploading}
                  >
                    <CropIcon className="w-4 h-4 mr-2" />
                    Crop Image
                  </Button>
                )}
                {showCrop && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCrop(false)}
                    disabled={isUploading}
                  >
                    Back to Preview
                  </Button>
                )}
              </div>
              
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDialogClose}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleUpload}
                  disabled={isUploading || !selectedFile}
                >
                  {isUploading ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}