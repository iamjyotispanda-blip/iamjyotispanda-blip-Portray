import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, X, Crop, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
    setIsDialogOpen(true);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      // Get presigned URL
      const response = await fetch("/api/objects/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { uploadURL } = await response.json();

      // Upload file to object storage
      const uploadResponse = await fetch(uploadURL, {
        method: "PUT",
        body: selectedFile,
        headers: {
          "Content-Type": selectedFile.type,
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {previewUrl && (
              <div className="flex justify-center">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-w-full max-h-64 object-contain rounded border"
                />
              </div>
            )}
            
            {selectedFile && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p><strong>File:</strong> {selectedFile.name}</p>
                <p><strong>Size:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                <p><strong>Type:</strong> {selectedFile.type}</p>
              </div>
            )}
            
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
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
        </DialogContent>
      </Dialog>
    </div>
  );
}