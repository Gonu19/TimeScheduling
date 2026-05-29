import { Copy, Link as LinkIcon, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { copyToClipboard, type Session } from "../types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  session: Session;
};

export function SessionLinkModal({ isOpen, onClose, session }: Props) {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const sessionUrl = `${baseUrl}/${session.id}`;
  
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    copyToClipboard(text, () => {
      setCopiedLink(id);
      toast.success("링크가 클립보드에 복사되었습니다.");
      setTimeout(() => setCopiedLink(null), 2000);
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <LinkIcon className="w-5 h-5 text-blue-600" />
            세션 링크 확인
          </DialogTitle>
          <DialogDescription className="sr-only">
            세션 링크와 참여자별 개인 링크를 복사하여 공유할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">전체 세션 링크</h3>
            <div className="flex items-center gap-2">
              <Input readOnly value={sessionUrl} className="bg-gray-50 text-gray-500 font-mono text-sm" />
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 text-gray-600 hover:text-gray-900"
                onClick={() => handleCopy(sessionUrl, "session")}
              >
                {copiedLink === "session" ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500">참여자들에게 공유할 세션 링크입니다. 관리자 UUID는 세션 생성 시에만 확인할 수 있습니다.</p>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button variant="default" onClick={onClose} className="w-full sm:w-auto bg-gray-900 hover:bg-gray-800 text-white">
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
