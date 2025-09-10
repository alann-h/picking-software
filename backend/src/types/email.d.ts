export interface MailjetMessage {
    From: {
        Email: string;
        Name: string;
    };
    To: {
        Email: string;
        Name: string;
    }[];
    Subject: string;
    TextPart: string;
    HTMLPart: string;
}

export interface MailjetRequest {
    Messages: MailjetMessage[];
}

export interface MailjetResponse {
    body: any; // Mailjet response body can be complex
}
