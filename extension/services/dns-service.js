// DNS Service - Client-side DNS queries using DNS-over-HTTPS
class DNSService {
  constructor() {
    // Free DNS-over-HTTPS providers
    this.dohProviders = [
      'https://cloudflare-dns.com/dns-query',
      'https://dns.google/resolve'
    ];
  }

  /**
   * Resolve DNS records via DNS-over-HTTPS (Cloudflare)
   */
  async resolve(domain, type = 'A') {
    try {
      const response = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${domain}&type=${type}`,
        {
          headers: {
            'Accept': 'application/dns-json'
          }
        }
      );

      if (!response.ok) throw new Error('DNS query failed');
      
      const data = await response.json();
      return data.Answer || [];

    } catch (error) {
      console.error(`DNS resolution failed for ${domain} (${type}):`, error);
      return [];
    }
  }

  /**
   * Check SPF record
   */
  async checkSPF(domain) {
    try {
      const records = await this.resolve(domain, 'TXT');
      const spfRecord = records.find(r => 
        r.data && r.data.includes('v=spf1')
      );

      if (!spfRecord) return 'fail';

      // Check SPF policy
      const spfData = spfRecord.data;
      if (spfData.includes('~all') || spfData.includes('-all')) {
        return 'pass';
      }
      return 'neutral';

    } catch (error) {
      return 'fail';
    }
  }

  /**
   * Check DMARC record
   */
  async checkDMARC(domain) {
    try {
      const dmarcDomain = `_dmarc.${domain}`;
      const records = await this.resolve(dmarcDomain, 'TXT');
      
      const dmarcRecord = records.find(r => 
        r.data && r.data.includes('v=DMARC1')
      );

      if (!dmarcRecord) return 'fail';

      const dmarcData = dmarcRecord.data;
      const policyMatch = dmarcData.match(/p=([^;]+)/);
      const policy = policyMatch ? policyMatch[1] : 'none';

      return policy === 'reject' || policy === 'quarantine' ? 'pass' : 'neutral';

    } catch (error) {
      return 'fail';
    }
  }

  /**
   * Get MX records
   */
  async getMXRecords(domain) {
    try {
      const records = await this.resolve(domain, 'MX');
      return records.map(r => ({
        exchange: r.data,
        priority: r.priority || 0
      })).sort((a, b) => a.priority - b.priority);

    } catch (error) {
      return [];
    }
  }

  /**
   * Reverse DNS lookup
   */
  async reverseDNS(ip) {
    try {
      const reversedIP = ip.split('.').reverse().join('.');
      const records = await this.resolve(`${reversedIP}.in-addr.arpa`, 'PTR');
      return records[0]?.data || null;

    } catch (error) {
      return null;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DNSService;
}
